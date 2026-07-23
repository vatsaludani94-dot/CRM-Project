const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const Activity = require('../models/Activity');
const crypto = require('crypto');
const { generateToken } = require('./authController');

/**
 * @desc    Create Workspace for authenticated tenant-less user (Google / Password / Passkey)
 * @route   POST /api/onboarding/create-workspace
 * @access  Private (Authenticated user without a tenant)
 */
const createWorkspace = async (req, res) => {
  const { companyName } = req.body;

  try {
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a valid company name' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.tenant && user.role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        error: 'User already belongs to a workspace tenant',
      });
    }

    let baseSubdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    if (!baseSubdomain) {
      baseSubdomain = 'workspace';
    }

    let subdomain = baseSubdomain;
    let tenantExists = await Tenant.findOne({ subdomain });
    if (tenantExists) {
      subdomain = `${baseSubdomain}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let tenant;
    try {
      tenant = await Tenant.create({
        name: companyName.trim(),
        subdomain,
        plan: 'free',
        status: 'active',
        owner: user._id, // Owner derived strictly from req.user (never trust req.body.ownerId)
      });
    } catch (err) {
      if (err.code === 11000) {
        subdomain = `${baseSubdomain}${Math.floor(10000 + Math.random() * 90000)}`;
        tenant = await Tenant.create({
          name: companyName.trim(),
          subdomain,
          plan: 'free',
          status: 'active',
          owner: user._id,
        });
      } else {
        throw err;
      }
    }

    // Atomic update with rollback protection
    try {
      user.tenant = tenant._id;
      user.role = 'workspace_owner';
      user.department = 'Management';
      await user.save();
    } catch (userSaveErr) {
      console.error('Failed to update user workspace association. Rolling back Tenant creation:', userSaveErr);
      await Tenant.findByIdAndDelete(tenant._id);
      throw userSaveErr;
    }

    await Activity.create({
      user: user._id,
      action: 'Workspace Created via Onboarding',
      details: `Created workspace "${tenant.name}" (${tenant.subdomain}).`,
      module: 'System',
      ipAddress: req.ip,
      tenant: tenant._id,
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
        },
        token: generateToken(user),
      },
    });
  } catch (error) {
    console.error('Onboarding Workspace Creation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Invite a team member to the current workspace
 * @route   POST /api/onboarding/invite
 * @access  Private (Workspace Owner or Manager)
 */
const inviteMember = async (req, res) => {
  const { email, role } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required for workspace invitation' });
    }

    if (!req.user.tenant) {
      return res.status(403).json({ success: false, error: 'User does not belong to any workspace tenant' });
    }

    // Role check: Only workspace_owner or manager can invite members
    if (!['workspace_owner', 'manager', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only workspace owners and managers can send invitations' });
    }

    // Role safety check: Cannot invite super_admin or workspace_owner via invitation token
    const targetRole = role && ['manager', 'employee', 'customer'].includes(role) ? role : 'employee';

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 day expiry

    const invitation = await Invitation.create({
      tenant: req.user.tenant,
      email: email.toLowerCase().trim(),
      role: targetRole,
      token,
      invitedBy: req.user._id,
      expiresAt,
    });

    const tenantInfo = await Tenant.findById(req.user.tenant).select('name');
    const companyName = tenantInfo ? tenantInfo.name : 'GrownX Workspace';

    const { sendInvitationEmail } = require('../services/invoice-email.service');
    await sendInvitationEmail(invitation.email, companyName, invitation.token, req.user.name);

    res.status(201).json({
      success: true,
      message: `Invitation email sent to ${email}`,
      data: {
        invitationId: invitation._id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invite Member Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get Invitation details by Token
 * @route   GET /api/onboarding/invitation/:token
 * @access  Public
 */
const getInvitation = async (req, res) => {
  const { token } = req.params;

  try {
    const invitation = await Invitation.findOne({ token, status: 'pending' }).populate('tenant', 'name subdomain');
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.status(404).json({ success: false, error: 'Invitation link is invalid or has expired' });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        companyName: invitation.tenant.name,
        subdomain: invitation.tenant.subdomain,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Accept Invitation and join workspace
 * @route   POST /api/onboarding/accept-invitation
 * @access  Private (Authenticated user)
 */
const acceptInvitation = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ success: false, error: 'Invitation token is required' });
    }

    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Invitation is invalid, expired, or already used' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify email match or account safety
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: `This invitation was sent to ${invitation.email}. You are currently logged in as ${user.email}.`,
      });
    }

    // Assign tenant and role
    user.tenant = invitation.tenant;
    user.role = invitation.role;
    await user.save();

    // Mark invitation accepted
    invitation.status = 'accepted';
    await invitation.save();

    await Activity.create({
      user: user._id,
      action: 'Joined Workspace via Invitation',
      details: `User joined workspace as ${user.role}.`,
      module: 'System',
      ipAddress: req.ip,
      tenant: invitation.tenant,
    });

    const tenant = await Tenant.findById(invitation.tenant).select('name subdomain plan');

    res.json({
      success: true,
      message: `Successfully joined ${tenant ? tenant.name : 'workspace'}!`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        tenant,
        token: generateToken(user),
      },
    });
  } catch (error) {
    console.error('Accept Invitation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createWorkspace,
  inviteMember,
  getInvitation,
  acceptInvitation,
};
