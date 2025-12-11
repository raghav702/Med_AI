/**
 * Password validation utilities
 */

export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
}

export interface PasswordRequirement {
  met: boolean;
  text: string;
}

/**
 * Check if password meets minimum requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      met: password.length >= 8,
      text: "At least 8 characters long"
    },
    {
      met: /[A-Z]/.test(password),
      text: "Contains uppercase letter"
    },
    {
      met: /[a-z]/.test(password),
      text: "Contains lowercase letter"
    },
    {
      met: /\d/.test(password),
      text: "Contains number"
    },
    {
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      text: "Contains special character"
    }
  ];
}

/**
 * Calculate password strength score and provide feedback
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: ["Password is required"],
      isValid: false
    };
  }

  const requirements = checkPasswordRequirements(password);
  const metRequirements = requirements.filter(req => req.met).length;
  const feedback: string[] = [];

  // Basic requirements check
  const unmetRequirements = requirements.filter(req => !req.met);
  if (unmetRequirements.length > 0) {
    feedback.push(...unmetRequirements.map(req => req.text));
  }

  // Additional strength checks
  if (password.length < 12) {
    feedback.push("Consider using 12+ characters for better security");
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push("Avoid repeating characters");
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    feedback.push("Avoid common patterns and words");
  }

  // Calculate score based on met requirements and additional factors
  let score = Math.min(metRequirements, 4);
  
  // Bonus points for length
  if (password.length >= 12) score = Math.min(score + 1, 4);
  if (password.length >= 16) score = Math.min(score + 1, 4);

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password) || /123|abc|qwe|password|admin/i.test(password)) {
    score = Math.max(score - 1, 0);
  }

  // Minimum requirements for validity (first 4 requirements)
  const isValid = requirements.slice(0, 4).every(req => req.met);

  return {
    score,
    feedback: feedback.length > 0 ? feedback : ["Strong password!"],
    isValid
  };
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return "Very Weak";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Strong";
    default:
      return "Unknown";
  }
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return "text-red-500";
    case 1:
      return "text-red-400";
    case 2:
      return "text-yellow-500";
    case 3:
      return "text-blue-500";
    case 4:
      return "text-green-500";
    default:
      return "text-gray-500";
  }
}