import { createTool } from "@mastra/core";
import { mistral } from "@ai-sdk/mistral";
import {generateText} from "ai";
import {getJson} from "serpapi";
import { z } from "zod";
import nodemailer from "nodemailer";



const model = mistral("mistral-small-latest");

const search_web = (query: string) => {

  let result:unknown;

const search_result = getJson({
 api_key: process.env.SERP_API_KEY,
 engine: "duckduckgo",
 q: query,
kl: "us-en"
},(json) => {
  type OrganicResult = [{}]
  //working on this
  // const organic_result = json.organic_result.filter((r) => r.position <= 5);
  // result = json;

})
return result
}

function generatePrompt() {}

export const studyReminderTool = createTool({
  id: "study-reminder-tool",
  description: "Sends a plain text email reminder to the user.",
  inputSchema: z.object({
    username: z.string(),
    email: z.string(),
    currentSubTopic: z.string()
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { username,email,currentSubTopic } = context;

    // Transporter is defined here in the same file
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: ``,
      text: ""
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  },
});
