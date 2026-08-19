export const VERIFY_EMAIL_SUBJECT = 'Verify your email address!';

/**
 * Table-based, fully centered transactional email. Every element —
 * logo, heading, code block, copy, footer — sits center-aligned, per
 * the requested design. Uses table layout (not flex/grid) for maximum
 * email-client compatibility.
 */
export function verificationEmailHtml({ code, name }: { code: string; name?: string }): string {
  const greetingName = name?.trim() ? name.trim() : 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${VERIFY_EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3f6;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(110,26,82,0.08);">

          <tr>
            <td align="center" style="background:linear-gradient(-45deg,#ec5252,#6e1a52);padding:28px 24px;">
              <img src="https://perfectoryvoice.com/logo.png" alt="Perfectory Voice" width="120" style="display:block;max-width:120px;height:auto;margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0;font-size:20px;line-height:1.4;color:#1a1a1a;text-align:center;font-weight:700;">
                Verify your email address
              </h1>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b6b;text-align:center;">
                Hi ${greetingName}, use the code below to finish creating your Perfectory Voice account.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" style="background-color:#f5f3f6;border-radius:14px;padding:18px 28px;">
                    <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#6e1a52;font-family:'Courier New',Courier,monospace;">${code}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:16px 32px 0 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8a8a;text-align:center;">
                This code expires in 60 minutes. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:32px 32px 28px 32px;">
              <div style="height:1px;width:100%;background-color:#efe9ee;margin-bottom:20px;"></div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a5a5a5;text-align:center;">
                &copy; ${new Date().getFullYear()} Perfectory Voice. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
