# Visitor-funded ChatGPT conversation

Implemented 11 October 2026. The homepage separates human contact from the AI demo: **Discuss a project** opens booking/contact, while the **Meet AI Ubaid** card shows **Coming soon** until configured, then **Ask about my work** opens the text conversation panel. The FAQ’s **Ask the AI me** entry can also open that panel. The hero availability flag uses the same server-side configuration validation as the API and is refreshed on deployment.

## What the experience does

- Explains the AI identity, portfolio context, eligible plan requirement and usage impact before connecting.
- Starts OpenAI authorization only after **Continue with ChatGPT** is clicked.
- Confirms plan usage after the first successful connection, with an acknowledgement remembered for that verified identity.
- Loads the account’s available models; never assumes the visitor has access to a hard-coded model.
- Streams text grounded in the existing persona and verified portfolio knowledge, with polite/unfiltered tone, suggested questions, Stop, retry, and disconnect.
- Keeps **Using ChatGPT plan** and **Manage usage** beside the composer.
- Preserves the draft and labels unfinished output after interruption or a late quota error. It never silently uses Ubaid’s Gemini key or another billing path.
- Keeps booking, email and project browsing available without signing in.

This is a text experience. No microphone, speech provider or facial renderer is started. The earlier Gemini/Decart implementation remains in the repository, but the public entry points no longer mount it. Keep `AVATAR_ENABLED=false` unless intentionally restoring that separate implementation.

## External prerequisite: approved hosted-client access

OpenAI’s self-service dynamic registration is for local/open-source clients with loopback callbacks. A remotely hosted portfolio must use an approved hosted integration. This implementation deliberately rejects `dynamic_agent_client` and does not redirect visitors to a local-machine callback.

Request a client through [OpenAI’s hosted integration process](https://developers.openai.com/siwc/request-client-id). Confirm that the approved client supports ChatGPT plan usage at the public Responses endpoint, using the documented `resource.invoke` and `chatgpt.tokens.use.direct` scopes. Website identity-only access is insufficient. If the partner contract differs, adapt the authorization/request contract before enabling the feature; do not assume identity approval includes inference.

Until approval and configuration are present, the actual UI shows **Connection opens soon** and a disabled connection button. No live connection or response is fabricated.

## Approval application and activation

The [official interest form](https://openai.com/form/sign-in-with-chatgpt-interest/) is the application route linked by OpenAI's client-registration documentation. Choose **Sign in and ChatGPT plan use for AI requests**. The program is a limited trial for selected hosted/commercial partners; the checked documentation does not promise acceptance or a response time.

Application prepared on 11 October 2026:

- Contact: Ubaidullah Omer, `itsubaidullahomer@gmail.com`.
- Company/practice: Ubaidullah Omer — Independent AI Product Engineer.
- Website: `https://itsubaidullahomer.com`.
- Product: **AI Ubaid**, a free text conversation grounded in the engineer's published work, allowing visitors to explore projects and discuss product ideas using their own eligible ChatGPT plan.
- Requested capability: hosted website sign-in **and** plan-funded Responses API access.
- Proposed callback: `https://itsubaidullahomer.com/api/chatgpt/callback`.

The owner confirmed submitting the form on 11 October 2026 after completing the browser step manually. OpenAI approval and hosted-client credentials are still pending. Submission alone does not enable the connection.

After OpenAI accepts the application:

1. Obtain the approved client ID, token authentication method, client secret if applicable, allowed callbacks, and explicit confirmation of the hosted plan-usage scopes and inference endpoint. Identity-only approval cannot enable the bot.
2. Register the exact production callback above, plus a separate development/staging callback if OpenAI supports it. Never reuse the open-source loopback registration to serve public visitors.
3. Configure the server environment with those credentials and an Upstash Redis database. A local `.env.local` has been prepared with a random session-encryption key, restrictive file permissions, and both enablement flags still `false`; it is ignored by Git. No OpenAI or Redis credentials have been supplied. Provision separate production secrets in the deployment environment.
4. Validate the approved contract against this implementation, then enable it in a restricted test deployment. Test real consent, model discovery, a completed answer, denied permission, usage limits, expiry and disconnect with an eligible account.
5. Deploy the verified configuration on the registered HTTPS domain and enable the public button. Local browser fixtures and an application submission are not substitutes for the real account test.

## Configuration

The existing Upstash Redis URL/token are reused. Add these server-only values from `.env.example`:

| Variable                      | Required value                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHATGPT_ENABLED`             | `true` after validation; defaults to `false`.                                                                                                                                                                    |
| `CHATGPT_PLAN_USAGE_APPROVED` | Explicit `true` only after OpenAI approves this hosted client for the implemented plan-usage contract.                                                                                                           |
| `CHATGPT_CLIENT_ID`           | Your approved `oaiapp_…` client.                                                                                                                                                                                 |
| `CHATGPT_TOKEN_AUTH_METHOD`   | Exactly the provisioned `client_secret_basic` or `none` method. No automatic fallback.                                                                                                                           |
| `CHATGPT_CLIENT_SECRET`       | Required only for a confidential client using `client_secret_basic`.                                                                                                                                             |
| `CHATGPT_REDIRECT_URI`        | Exact registered callback, e.g. `https://itsubaidullahomer.com/api/chatgpt/callback`. HTTPS is required in production. Development can use a separately registered `http://127.0.0.1:3000/api/chatgpt/callback`. |
| `CHATGPT_PLAN_SCOPE`          | `chatgpt.tokens.use.direct` only if approved for this hosted client. Blank keeps the feature off.                                                                                                                |
| `CHATGPT_SESSION_SECRET`      | 32 random bytes encoded as 64 hexadecimal characters. Store as a secret. Rotation invalidates existing encrypted sessions.                                                                                       |

No owner OpenAI API key is used. No refresh token or offline-access permission is requested: this is a short portfolio demo, not a persistent connection. Connection expiry is at most 15 minutes, or the provider expiry if earlier. Reconnecting requires explicit visitor action.

## Security and data lifecycle

- The authorization, token and JWKS endpoints come from OpenAI’s fixed production discovery URL. Their origins and the issuer are validated before use.
- State, nonce and PKCE verifier are fresh per attempt and encrypted in Redis for 10 minutes. An opaque HttpOnly browser cookie binds the attempt. Redis GETDEL consumes the transaction atomically, including failed callbacks.
- ID tokens are verified with `jose`: signature, allowed algorithms, issuer, audience, expiry, subject, nonce and authorized party. Callback-supplied client IDs cannot replace the configured client.
- Identity success alone never enables inference. The returned grants must include both model-invocation and plan-usage permissions.
- Provider access tokens and short-lived chat history are AES-256-GCM encrypted in Redis, with session-bound TTLs. Browser JavaScript receives only an opaque first-party cookie plus the display state and its own transcript. It never receives provider tokens, client secrets, PKCE verifiers or ID tokens.
- Chat/start/acknowledge/disconnect requests require the same registered origin. Redirects return to the registered site; callback parameters cannot choose a return URL.
- Authentication attempts are rate-limited. Conversations allow 24 completed turns, 1,200 characters per message, one in-flight response per connection, 45 seconds per response and 6,000 response characters. History is server-owned and bounded. Provider-supported plan requests omit unsupported output-token-limit parameters.
- Streaming output is displayed as plain text. Only an explicit provider `response.completed` is committed to history. Failed or incomplete streams do not become successful assistant turns.
- Disconnect removes this site’s connection, model cache and chat history. The app cannot promise provider-side grant revocation; users manage that in ChatGPT settings. A small identity-bound acknowledgement cookie lasts 30 days and contains no token or readable account identity.
- Closing the panel aborts an in-flight response. Closing alone retains the encrypted short-lived connection and completed transcript so a visitor can reopen it. Disconnect clears them.

## Source and verification

- [Hosted website OAuth](https://developers.openai.com/siwc/website)
- [Plan-usage availability](https://developers.openai.com/siwc/token-sharing-open-source)
- [Plan scopes and grants](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Model discovery and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Request limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Failure handling](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)
- [Plan-usage UI](https://developers.openai.com/siwc/ui-ux-guidelines)
- The local ChatGPT mark is the official white SVG linked by OpenAI’s website sign-in guide: `https://developers.openai.com/assets/siwc/sign-in-buttons/chatgpt-logo-white.svg`.

`tests/chatgpt-security.test.ts` verifies cryptography, identity validation, permission boundaries, input constraints, model filtering, configuration gates and stream parsing. `scripts/qa/chatgpt.mjs` checks the real missing-configuration path and separately labeled mock authorization/streaming states. No paid/account-specific call is made during these tests.

Before turning this on publicly, validate a real approved account end to end: consent, actual returned scopes, model discovery, streamed completion, quota rejection, interruption, expiry and disconnect. Mocked transport cannot prove the hosted partner grant is available or compatible.
