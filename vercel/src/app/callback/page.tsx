"use client"

import { useEffect } from "react"
import { OAUTH_CALLBACK_KEY } from "../../../config"
import { useRouter } from "next/navigation"

const Callback = () => {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(location.hash.substring(1))

    const oauthData = {
      state: params.get("state"),
      accessToken: params.get("access_token"),
      tokenType: params.get("token_type"),
      expiresIn: params.get("expires_in"),
      scope: params.get("scope"),
    }

    console.dir(oauthData)
    localStorage.setItem(OAUTH_CALLBACK_KEY, JSON.stringify(oauthData))

    router.replace("transactions")
  }, [router])

  return <div>Updating local storage with new data...</div>
}

export default Callback
