'use client'

import { useState } from 'react'
import { sendPhoneOtp } from '@/actions/auth'
import PhoneStep from './PhoneStep'
import OtpStep from './OtpStep'
import PasskeyStep from './PasskeyStep'
import ProfileStep from './ProfileStep'

type Step = 'phone' | 'otp' | 'passkey' | 'profile'

export default function SignupFlow() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  // accessToken = Supabase JWT (used only during signup for passkey registration)
  const [accessToken, setAccessToken] = useState('')
  const [userId, setUserId] = useState('')

  return (
    <div>
      {step === 'phone' && (
        <PhoneStep
          onSubmit={async (phoneNumber) => {
            const result = await sendPhoneOtp(phoneNumber)
            if (result.error) return result.error
            setPhone(phoneNumber)
            setStep('otp')
          }}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onVerified={(token, uid) => {
            setAccessToken(token)
            setUserId(uid)
            setStep('passkey')
          }}
        />
      )}
      {step === 'passkey' && (
        <PasskeyStep
          accessToken={accessToken}
          onComplete={() => setStep('profile')}
          onSkip={() => setStep('profile')}
        />
      )}
      {step === 'profile' && <ProfileStep userId={userId} />}
    </div>
  )
}
