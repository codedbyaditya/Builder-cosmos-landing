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
  if (!googleClientId || googleClientId === "your-google-client-id") {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm text-center">
            Google OAuth not configured. Please add VITE_GOOGLE_CLIENT_ID to
            your environment variables.
          </p>
        </div>
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
