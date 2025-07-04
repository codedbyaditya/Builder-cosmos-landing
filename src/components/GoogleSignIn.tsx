import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  text?: "signin_with" | "signup_with" | "continue_with";
  shape?: "rectangular" | "pill" | "circle" | "square";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  className?: string;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({
  onSuccess,
  onError,
  disabled = false,
  text = "signin_with",
  shape = "rectangular",
  theme = "outline",
  size = "large",
  className = "",
}) => {
  const { login: googleLogin } = useGoogleAuth();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const success = await googleLogin(credentialResponse);

      if (success) {
        // Integrate with existing auth context
        const googleUser = JSON.parse(
          localStorage.getItem("google_user") || "{}",
        );

        // Set user in main auth context
        setUser({
          id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          role: "user",
          avatar: googleUser.picture,
          provider: "google",
        });

        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/");
        }
      } else {
        throw new Error("Google authentication failed");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (onError) {
        onError(error);
      }
    }
  };

  const handleError = () => {
    console.error("Google Sign-In Error: Login failed");
    if (onError) {
      onError(new Error("Google login failed"));
    }
  };

  // Check if Google Client ID is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Development mode fallback
  if (
    !googleClientId ||
    googleClientId === "your-google-client-id" ||
    googleClientId === "development"
  ) {
    const handleDevelopmentLogin = () => {
      // Mock Google OAuth for development
      const mockGoogleUser = {
        id: "dev_user_" + Date.now(),
        email: "demo@bindisa.com",
        name: "Demo User",
        picture: "https://via.placeholder.com/96x96/4CAF50/white?text=DU",
        given_name: "Demo",
        family_name: "User",
      };

      // Set user in main auth context
      setUser({
        id: mockGoogleUser.id,
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        role: "user",
        avatar: mockGoogleUser.picture,
        provider: "google",
      });

      // Save to localStorage for persistence
      localStorage.setItem("google_user", JSON.stringify(mockGoogleUser));
      localStorage.setItem(
        "bindisa-user",
        JSON.stringify({
          id: mockGoogleUser.id,
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          role: "user",
          avatar: mockGoogleUser.picture,
          provider: "google",
        }),
      );

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/");
      }
    };

    return (
      <div className={`w-full ${className}`}>
        <button
          onClick={handleDevelopmentLogin}
          disabled={disabled}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-primary transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {text === "signup_with"
            ? "Sign up with Google (Demo)"
            : "Sign in with Google (Demo)"}
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Development mode - Click to test Google OAuth flow
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text={text}
        shape={shape}
        theme={theme}
        size={size}
        disabled={disabled}
        useOneTap={false}
        auto_select={false}
      />
    </div>
  );
};

export default GoogleSignIn;
