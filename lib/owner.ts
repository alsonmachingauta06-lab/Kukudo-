export const KUKUDO_OWNER = {
  name: "Alson Machingauta",
  emails: ["alsonmachingauta06@gmail.com", "alsonmachingauta6@gmail.com"],
  phones: ["263786359833", "263783549857"],
  channelUrl: "https://whatsapp.com/channel/0029Vb7dL1LHltY3pgCvwR3B",
  groupUrl: "https://chat.whatsapp.com/LQMrievFuQW6GyqDRxuvRu?s=cl&p=a&mlu=4&ilr=4",
} as const;

export function isKukudoOwnerEmail(email?: string | null) {
  return !!email && KUKUDO_OWNER.emails.some((x) => x.toLowerCase() === email.toLowerCase());
}
