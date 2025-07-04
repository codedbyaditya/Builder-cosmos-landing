import React, { createContext, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Google OAuth Configuration
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id";

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  login: (credentialResponse: any) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(
  undefined,
);

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
  }
  return context;
};

interface GoogleAuthProviderProps {
  children: React.ReactNode;
}

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("google_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("google_user");
      }
    }
  }, []);

  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  const login = async (credentialResponse: any): Promise<boolean> => {
    setIsLoading(true);

    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }

      // Decode the JWT token from Google
      const userInfo = decodeJWT(credentialResponse.credential);

      if (!userInfo) {
        throw new Error("Failed to decode user information");
      }

      const googleUser: GoogleUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        given_name: userInfo.given_name || "",
        family_name: userInfo.family_name || "",
      };

      // Save user info to localStorage and state
      localStorage.setItem("google_user", JSON.stringify(googleUser));
      localStorage.setItem("google_token", credentialResponse.credential);
      setUser(googleUser);

      // Optional: Send to your backend for verification and user creation
      try {
        await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: credentialResponse.credential,
            userInfo: googleUser,
          }),
        });
      } catch (backendError) {
        console.warn(
          "Backend authentication failed, continuing with client-side auth:",
          backendError,
        );
        // Continue with client-side authentication even if backend fails
      }

      return true;
    } catch (error) {
      console.error("Google login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("google_user");
    localStorage.removeItem("google_token");

    // Optional: Notify backend of logout
    try {
      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        // Ignore backend logout errors
      });
    } catch (error) {
      // Ignore logout errors
    }
  };

  const value: GoogleAuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading,
  };

  // Only render GoogleOAuthProvider if we have a valid client ID
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "your-google-client-id") {
    console.warn(
      "Google Client ID not configured. Google OAuth will not work.",
    );
    return (
      <GoogleAuthContext.Provider value={value}>
        {children}
      </GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleAuthContext.Provider value={value}>
        {children}
      </GoogleAuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export default GoogleAuthProvider;
