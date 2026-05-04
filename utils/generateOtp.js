/**
 * Generate a random 4-digit OTP
 * @returns {string}
 */
export const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Get OTP expiry time (default 5 minutes)
 * @returns {Date}
 */
export const getOtpExpiryTime = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

/**
 * Check if OTP is expired
 * @param {Date} expiryTime 
 * @returns {boolean}
 */
export const isOtpExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};
