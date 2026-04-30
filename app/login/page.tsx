"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LoginPage() {

  const router = useRouter()

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")

  async function signUp(){

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if(error){
      alert(error.message)
    }else{
      alert("Account created. You can now log in.")
    }

  }

  async function signIn(){

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if(error){
      alert(error.message)
    }else{
      router.push("/")
    }

  }

  return(

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="bg-gray-900 p-10 rounded-lg w-96 space-y-6">

        <h1 className="text-3xl font-bold text-center">
          Login
        </h1>

        <input
          placeholder="Email"
          className="w-full p-3 rounded text-black"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full p-3 rounded text-black"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          className="w-full bg-green-500 p-3 rounded"
        >
          Login
        </button>

        <button
          onClick={signUp}
          className="w-full bg-blue-500 p-3 rounded"
        >
          Create Account
        </button>

      </div>

    </main>

  )
}
