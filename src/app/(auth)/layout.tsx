import React from 'react'

const AuthLayout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='flex items-center justify-center w-screen p-4'>{children}</div>
  )
}

export default AuthLayout