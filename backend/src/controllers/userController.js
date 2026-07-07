import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { Lot } from '../models/Lot.js';
import { Transaction } from '../models/Transaction.js';
import { resend } from '../utils/email.js';



export const getUsers = async (req, res) => {
  try {
    const list = await User.getAll();
    res.json(list);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: "Failed to fetch user accounts." });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password, role, attendance_rate } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  try {
    // Check if name or email already exists
    const users = await User.getAll();
    const exists = users.some(u => u.name.toLowerCase() === name.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "A user with this Name or Email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const attendance = parseFloat(attendance_rate || 95.0);
    const avatar = null;

    const newUser = await User.create({
      name,
      email,
      password_hash,
      role,
      attendance_rate: attendance,
      avatar
    });

    res.status(201).json({ success: true, message: "User account created successfully!", user: newUser });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: "Failed to create user account." });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You cannot deactivate your own administrative account." });
    }

    const updatedUser = await User.toggleStatus(targetId);
    if (!updatedUser) {
      return res.status(404).json({ error: "Target user not found." });
    }

    res.json({
      success: true,
      message: `User '${updatedUser.name}' has been ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully!`,
      user: updatedUser
    });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: "Failed to toggle user account status." });
  }
};

export const dispatchEmail = async (req, res) => {
  const {
    lot_id,
    recipient_email,
    recipient_name,
    challan_no,
    qty_sent,
    received_qty,
    cc_emails,
    subject,
    custom_remarks
  } = req.body;

  if (!lot_id || !recipient_email || !recipient_name) {
    return res.status(400).json({ error: "Missing required dispatch fields." });
  }

  try {
    const lot = await Lot.findById(parseInt(lot_id));
    if (!lot) {
      return res.status(404).json({ error: "Lot not found." });
    }

    const diff = Math.abs(parseInt(qty_sent) - parseInt(received_qty));
    const isShortage = parseInt(received_qty) < parseInt(qty_sent);
    const discrepancyType = isShortage ? 'Short' : 'Excess';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    h2, h3 { color: #111827; }
    p { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; text-align: left; }
    th { background-color: #ffd400; color: #000000; font-weight: bold; border: 1px solid #dddddd; padding: 10px; text-align: center; }
    td { border: 1px solid #dddddd; padding: 10px; text-align: center; }
    .highlight-yellow { background-color: #fef08a; }
    .diff-cell { font-weight: bold; color: #ffffff; }
    .diff-short { background-color: #ef4444 !important; }
    .diff-excess { background-color: #fb923c !important; }
    .signature { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #666666; }
  </style>
</head>
<body>
  <div class="email-container">
    <p>Dear ${recipient_name},</p>
    <p>Greetings from Electrolyte Solutions..!</p>
    
    ${lot.client_name === 'Atomberg' ? `
      <p>I would like to inform you about discrepancies observed in the PCB received against Challan No. <strong>${challan_no || 'N/A'}</strong>. The following table provides detailed information on the short and excess quantities received:</p>
    ` : `
      <p>We have checked Lot No. <strong>${lot.lot_no}</strong> and found some PCB quantity differences (short/excess). Details are shared below. Kindly review and update.</p>
    `}

    <table>
      <thead>
        <tr>
          <th>Challan No. / Ref</th>
          <th>Challan Qty</th>
          <th>Received Qty</th>
          <th>Diff</th>
          <th>Discrepancy Type</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="highlight-yellow">${challan_no || `Lot ${lot.lot_no}`}</td>
          <td class="highlight-yellow">${qty_sent}</td>
          <td class="highlight-yellow">${received_qty}</td>
          <td class="diff-cell ${isShortage ? 'diff-short' : 'diff-excess'}">${isShortage ? `-${diff}` : `+${diff}`}</td>
          <td class="highlight-yellow">${discrepancyType}</td>
        </tr>
      </tbody>
    </table>

    ${custom_remarks ? `<p>${custom_remarks}</p>` : `
      ${lot.client_name === 'Atomberg' ? `
        <p>Kindly suggest the way forward and would like to invite @CC CWH Mumbai Spare and @Chetan Joshi Sir to visit our facility and cross verify the quantities.</p>
      ` : `
        <p>Please let us know if any further information is required from our side</p>
      `}
    `}

    <div class="signature">
      Warm regards,<br>
      <strong>Electrolyte Solutions Team</strong><br>
      <span style="font-size: 11px; color: #9ca3af;">Automated Operations Dispatcher</span>
    </div>
  </div>
</body>
</html>
    `;

    if (resend) {
      console.log(`[Resend SDK] Attempting live email dispatch to ${recipient_email}...`);
      const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const toAddresses = recipient_email.split(',').map(email => email.trim()).filter(Boolean);
      const ccAddresses = cc_emails ? cc_emails.split(',').map(email => email.trim()).filter(Boolean) : undefined;
      
      const { data, error } = await resend.emails.send({
        from: `"Electrolyte Solutions" <${resendFrom}>`,
        to: toAddresses,
        cc: ccAddresses && ccAddresses.length > 0 ? ccAddresses : undefined,
        subject: subject,
        html: emailHtml
      });
      
      if (error) {
        console.error('[Resend SDK Error] Failed to send email via Resend:', error);
        throw new Error(`Resend SDK error: ${JSON.stringify(error)}`);
      }
      console.log('[Resend SDK] Live email sent successfully!', data);
    } else {
      console.warn('[Resend SDK Warning] RESEND_API_KEY is not set. Live email dispatch skipped (simulated).');
    }

    let fileWritten = false;
    let fileName = '';
    let filePath = '';

    try {
      const outputDir = path.join(process.cwd(), 'scratch', 'dispatched_emails');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fileName = `email_lot_${lot.lot_no}_${Date.now()}.html`;
      filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, emailHtml, 'utf8');
      fileWritten = true;
    } catch (fsErr) {
      console.warn('[FS Warning] Could not write local email backup:', fsErr.message);
    }

    // Log transaction
    const transRemarks = `Discrepancy email dispatched to ${recipient_email} (${recipient_name}) regarding Lot #${lot.lot_no}.${fileWritten ? ` File: ${fileName}` : ' (Local backup skipped)'}`;
    await Transaction.create({
      lot_id: lot.id,
      transaction_type: 'Email Dispatch',
      qty: 0,
      actor_id: req.user.id,
      remarks: transRemarks
    });

    const isLiveDispatch = !!process.env.RESEND_API_KEY;
    res.json({
      success: true,
      message: isLiveDispatch
        ? "Discrepancy email dispatched live successfully via Resend SDK!"
        : `Discrepancy email simulated successfully! ${fileWritten ? 'Output saved to scratch/dispatched_emails/' + fileName : 'Simulation logged.'}`,
      file_path: fileWritten ? filePath : null,
      file_name: fileWritten ? fileName : null
    });

  } catch (err) {
    console.error('Email dispatch error:', err);
    res.status(500).json({ error: "Failed to dispatch email." });
  }
};
