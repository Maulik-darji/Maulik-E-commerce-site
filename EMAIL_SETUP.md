# Email Notification Setup Guide

## To prevent emails from going to spam folder, follow these steps:

### Option 1: EmailJS (Recommended for beginners)

1. **Sign up at EmailJS.com**
2. **Create an Email Service:**
   - Go to Email Services
   - Add Gmail, Outlook, or other service
   - Connect your email account

3. **Create Email Template:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Notification from Your Store</title>
   </head>
   <body>
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <h2>{{subject}}</h2>
           <p>{{message}}</p>
           <hr>
           <p><small>This is an automated notification from Your E-commerce Store</small></p>
       </div>
   </body>
   </html>
   ```

4. **Update the sendEmailNotification function in App.js:**
   ```javascript
   async function sendEmailNotification(email, title, message) {
     try {
       const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           service_id: 'YOUR_SERVICE_ID', // From EmailJS dashboard
           template_id: 'YOUR_TEMPLATE_ID', // From EmailJS dashboard
           user_id: 'YOUR_USER_ID', // From EmailJS dashboard
           template_params: {
             to_email: email,
             subject: title,
             message: message,
             from_name: 'Your E-commerce Store',
             reply_to: 'noreply@yourstore.com'
           }
         })
       });

       if (!response.ok) {
         throw new Error('Failed to send email');
       }

       console.log(`Email sent successfully to ${email}`);
     } catch (error) {
       console.error(`Error sending email to ${email}:`, error);
     }
   }
   ```

### Option 2: SendGrid (Professional service)

1. **Sign up at SendGrid.com**
2. **Verify your domain** (prevents spam folder)
3. **Create API key**
4. **Update the function:**
   ```javascript
   async function sendEmailNotification(email, title, message) {
     try {
       const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
         method: 'POST',
         headers: {
           'Authorization': 'Bearer YOUR_SENDGRID_API_KEY',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           personalizations: [{
             to: [{ email: email }]
           }],
           from: { email: 'noreply@yourdomain.com', name: 'Your Store' },
           subject: title,
           content: [{
             type: 'text/html',
             value: `<h2>${title}</h2><p>${message}</p>`
           }]
         })
       });

       if (!response.ok) {
         throw new Error('Failed to send email');
       }

       console.log(`Email sent successfully to ${email}`);
     } catch (error) {
       console.error(`Error sending email to ${email}:`, error);
     }
   }
   ```

### Option 3: Firebase Functions with SendGrid

1. **Install Firebase Functions**
2. **Create a Cloud Function:**
   ```javascript
   const functions = require('firebase-functions');
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(functions.config().sendgrid.key);

   exports.sendNotificationEmail = functions.https.onCall(async (data, context) => {
     const { email, title, message } = data;
     
     const msg = {
       to: email,
       from: 'noreply@yourdomain.com',
       subject: title,
       html: `<h2>${title}</h2><p>${message}</p>`,
     };
     
     try {
       await sgMail.send(msg);
       return { success: true };
     } catch (error) {
       throw new functions.https.HttpsError('internal', error.message);
     }
   });
   ```

## Anti-Spam Best Practices:

1. **Use a verified domain** (not free email like Gmail)
2. **Set up SPF, DKIM, and DMARC records**
3. **Use consistent "From" addresses**
4. **Include unsubscribe links**
5. **Avoid spam trigger words**
6. **Maintain good sender reputation**

## Quick Setup (EmailJS):

1. Replace `YOUR_SERVICE_ID`, `YOUR_TEMPLATE_ID`, and `YOUR_USER_ID` in the function
2. Test with a few emails first
3. Monitor spam folder initially
4. Gradually increase volume

## Current Status:
- ✅ Email notification function is ready
- ✅ Will send to all registered users
- ⚠️ Need to configure actual email service
- ⚠️ Need to replace placeholder function with real service
