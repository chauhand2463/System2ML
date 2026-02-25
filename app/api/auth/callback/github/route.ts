import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const provider = 'github'

  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url))
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    let email = userData.email
    if (!email && tokenData.scope?.includes('user:email')) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })
      const emails = await emailsResponse.json()
      const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)
      email = primaryEmail?.email
    }

    const user = {
      id: String(userData.id),
      name: userData.name || userData.login,
      email: email || `${userData.login}@github.com`,
      avatar: userData.avatar_url,
      provider: 'github',
    }

    const userParam = encodeURIComponent(JSON.stringify(user))
    return NextResponse.redirect(new URL(`/auth/callback?user=${userParam}`, request.url))
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
  }
}
