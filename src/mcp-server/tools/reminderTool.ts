import { createTool } from "@mastra/core";
import { z } from "zod";
import nodemailer from "nodemailer";

export const studyReminderTool = createTool({
  id: "study-reminder-tool",
  description: "Sends a plain text email reminder to the user.",
  inputSchema: z.object({
    to: z.string(),
    subject: z.string(),
    message: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { to, subject, message } = context;

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
      to,
      subject,
      text: message, // plain text only
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  },
});
