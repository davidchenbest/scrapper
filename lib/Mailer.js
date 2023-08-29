// send email notification to self for client request events
import nodemailer from 'nodemailer'
export default class Mailer {
    constructor() {
        if (this.constructor.instance) return this.constructor.instance
        this.email = process.env.MAILER_EMAIL
        this.transporter = nodemailer.createTransport({
            service: 'hotmail',
            auth: {
                user: this.email,
                pass: process.env.MAILER_PASSWORD
            }
        });
    }

    async sendEmail(html, subject, attachments = null) {
        const mailOptions = {
            from: this.email,
            to: [process.env.MAIN_CALENDAR_ID],
            subject,
            html
        };
        if (attachments) mailOptions.attachments = attachments
        try {
            const info = await this.transporter.sendMail(mailOptions)
            console.log('Email sent: ' + info.response);
            return info
        } catch (error) {
            console.error(error);
            await alternativeSender(subject, html)
            return error.message
        }
    }
}

async function alternativeSender(subject, body) {
    const res = await fetch('https://jiachen.vercel.app/api/email', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.MAILER_PASSWORD,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject,
            body
        })
    })
    if (res.status !== 200) throw new Error('alternative email not sending')
}