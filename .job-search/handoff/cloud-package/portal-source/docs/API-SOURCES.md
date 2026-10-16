# Integration references, verified 10 October 2026

- Google Live ephemeral tokens: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- Google Live capabilities, audio formats, transcription and tools: https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Installed `@google/genai` declarations confirm `expireTime` rejects messages after expiry; `uses: 1`, `liveConnectConstraints`, and `lockAdditionalFields` are supported.
- Decart client tokens: https://docs.platform.decart.ai/getting-started/client-tokens
- Decart token constraints and model scoping: https://docs.platform.decart.ai/api-reference/create-client-token
- Decart JavaScript SDK: https://github.com/DecartAI/sdk/tree/main/packages/sdk
- Decart model index: https://docs.platform.decart.ai/llms.txt
- Current Decart model union contains Lucy 2.1, 2.5, VTON and restyle models. `live_avatar` and a PCM-driven portrait protocol are absent. Facial animation cannot be honestly implemented against this public API. The route is present but does not mint tokens; the requested voice-plus-portrait fallback is the shipped renderer.
- Cal embed uses the installed official `@calcom/embed-react` component and its `calLink`/`config` contract. https://cal.com/docs/developing/guides/embeds
- Senja embeds use the official widget script path and the configured widget ID. https://support.senja.io/add-senja-testimonials-to-your-app-byv55 (requires a real widget ID to verify a specific embed).
- Motion reduced-motion guidance: https://motion.dev/docs/react-accessibility
- GitHub contributions schema: https://docs.github.com/en/graphql/reference/objects#contributioncalendar
- GitHub public events: https://docs.github.com/en/rest/activity/events

Live paid services cannot be integration-tested without the owner’s credentials. The no-configuration paths, protocol adapters, input limits, UI states and cleanup are tested locally. Do not treat mocked browser tests as a live provider test.

## ChatGPT connection, checked 11 October 2026

See [CHATGPT.md](CHATGPT.md) for the exact official OAuth, plan-usage, streaming, model, limitation and UI references. The documented local/open-source grant is not treated as permission to run a public hosted client. Activation requires an approved hosted client supporting the implemented scope and Responses contract.
