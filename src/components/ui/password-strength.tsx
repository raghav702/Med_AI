import { cn } from "@/lib/utils";
import { 
  calculatePasswordStrength, 
  getPasswordStrengthLabel, 
  getPasswordStrengthColor,
  checkPasswordRequirements 
} from "@/lib/password-validation";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrength({ 
  password, 
  showRequirements = true, 
  className 
}: PasswordStrengthProps) {
  const strength = calculatePasswordStrength(password);
  const requirements = checkPasswordRequirements(password);

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Password strength</span>
          <span className={cn("text-sm font-medium", getPasswordStrengthColor(strength.score))}>
            {getPasswordStrengthLabel(strength.score)}
          </span>
        </div>
        
        {/* Strength Bar */}
        <div className="flex space-x-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                level < strength.score
                  ? strength.score <= 1
                    ? "bg-red-500"
                    : strength.score <= 2
                    ? "bg-yellow-500"
                    : strength.score <= 3
                    ? "bg-blue-500"
                    : "bg-green-500"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Requirements:</span>
          <div className="space-y-1">
            {requirements.slice(0, 4).map((requirement, index) => (
              <div key={index} className="flex items-center space-x-2">
                {requirement.met ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span className={cn(
                  "text-sm",
                  requirement.met ? "text-green-600" : "text-muted-foreground"
                )}>
                  {requirement.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {strength.feedback.length > 0 && !strength.isValid && (
        <div className="space-y-1">
          {strength.feedback.slice(0, 3).map((feedback, index) => (
            <p key={index} className="text-sm text-muted-foreground">
              • {feedback}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}