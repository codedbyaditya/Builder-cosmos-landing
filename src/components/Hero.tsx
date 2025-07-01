import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ChevronDown,
  Leaf,
  Target,
  Users,
  Award,
  TrendingUp,
} from "lucide-react";

interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: {
    text: string;
    onClick: () => void;
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  backgroundImage?: string;
  className?: string;
  children?: React.ReactNode;
}

const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  backgroundImage,
  className = "",
  children,
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const stats = [
    { icon: Users, value: "1000+", label: "Farmers Empowered" },
    { icon: TrendingUp, value: "45%", label: "Yield Improvement" },
    { icon: Leaf, value: "15+", label: "Crops Supported" },
    { icon: Award, value: "5+", label: "Recognition" },
  ];

  return (
    <section
      className={`relative py-20 lg:py-32 hero-bg overflow-hidden ${className}`}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
    >
      <div className="container-max section-padding relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {subtitle && (
            <div className="relative">
              <p className="text-lg text-agri-primary font-semibold mb-4 animate-fade-in-up">
                {subtitle}
              </p>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-agri-primary to-agri-secondary rounded-full animate-pulse"></div>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-up delay-200">
            <span className="agri-text-gradient inline-block hover:scale-105 transition-transform duration-300">
              {title}
            </span>
          </h1>

          {description && (
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up delay-400 leading-relaxed">
              {description}
            </p>
          )}

          {(primaryAction || secondaryAction) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-600 mb-16">
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  size="lg"
                  className="btn-agri-primary text-lg px-8 py-4 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  <span className="group-hover:translate-x-1 transition-transform duration-200">
                    {primaryAction.text}
                  </span>
                </Button>
              )}
              {secondaryAction && (
                <Button
                  onClick={secondaryAction.onClick}
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-4 border-agri-primary text-agri-primary hover:bg-agri-primary hover:text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {secondaryAction.text}
                </Button>
              )}
            </div>
          )}

          {children && (
            <div className="mt-12 animate-fade-in-up delay-1000">
              {children}
            </div>
          )}

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-agri-primary" />
          </div>
        </div>
      </div>

      {/* Enhanced Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-agri-primary/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}

        {/* Interactive Background Orbs */}
        <div
          className="absolute w-80 h-80 bg-agri-primary/10 rounded-full blur-3xl transition-all duration-300"
          style={{
            top: `-${scrollY * 0.5}px`,
            right: `-${160 + mousePosition.x * 0.05}px`,
          }}
        />
        <div
          className="absolute w-80 h-80 bg-agri-secondary/10 rounded-full blur-3xl transition-all duration-300"
          style={{
            bottom: `-${160 - scrollY * 0.3}px`,
            left: `-${160 + mousePosition.y * 0.05}px`,
          }}
        />

        {/* Very light overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/10" />
      </div>
    </section>
  );
};

export default Hero;
