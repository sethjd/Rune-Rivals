export const ONLINE_EMOTES = [
  { id: "good-luck", text: "Good luck" },
  { id: "nice-chain", text: "Nice chain!" },
  { id: "ouch", text: "Ouch" },
  { id: "rematch", text: "Rematch?" }
];

export function getOnlineEmote(id) {
  return ONLINE_EMOTES.find((emote) => emote.id === id) ?? null;
}
