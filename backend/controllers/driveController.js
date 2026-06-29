const DriveFolder = require('../models/DriveFolder');
const DriveFile = require('../models/DriveFile');

const getDriveFolders = async (req, res) => {
  try {
    const folders = await DriveFolder.find({ tenant: req.user.tenant })
      .populate('parentFolder', 'name')
      .sort({ name: 1 });
    res.json({ success: true, count: folders.length, data: folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createFolder = async (req, res) => {
  try {
    const { name, type, referenceId, parentFolderId, permissions } = req.body;
    
    const folder = await DriveFolder.create({
      name,
      type: type || 'General',
      referenceId: referenceId || undefined,
      parentFolder: parentFolderId || undefined,
      permissions: permissions || { roleAccess: ['super_admin', 'manager', 'employee'] },
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getFolderContents = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const userRole = req.user.role;

    const folder = await DriveFolder.findOne({ _id: folderId, tenant: req.user.tenant });
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    // RBAC Permissions check on folder
    if (folder.permissions && folder.permissions.roleAccess && !folder.permissions.roleAccess.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied: Insufficient permissions for this folder' });
    }

    const subfolders = await DriveFolder.find({ parentFolder: folderId, tenant: req.user.tenant });
    const files = await DriveFile.find({ folder: folderId, tenant: req.user.tenant }).populate('uploadedBy', 'name');

    res.json({
      success: true,
      data: {
        folder,
        subfolders,
        files
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    const { name, mimeType, sizeBytes, url, folderId } = req.body;

    const folder = await DriveFolder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Target folder not found' });
    }

    const file = await DriveFile.create({
      name,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: sizeBytes || 1024,
      url: url || '/assets/mock-doc.pdf',
      folder: folderId,
      uploadedBy: req.user._id,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await DriveFile.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Auto creation helper for Customer and Deals
const autoCreateCustomerFolder = async (customer, tenantId) => {
  try {
    // Create base Customer folder
    const folder = await DriveFolder.create({
      name: `${customer.companyName || customer.contactPerson} - Folder`,
      type: 'Customer',
      referenceId: customer._id,
      tenant: tenantId,
      permissions: { roleAccess: ['super_admin', 'manager', 'employee'] }
    });

    // Create standard child folders
    await DriveFolder.create({
      name: 'Contracts',
      type: 'Customer',
      referenceId: customer._id,
      parentFolder: folder._id,
      tenant: tenantId,
    });

    await DriveFolder.create({
      name: 'Invoices',
      type: 'Customer',
      referenceId: customer._id,
      parentFolder: folder._id,
      tenant: tenantId,
    });

    await DriveFolder.create({
      name: 'Proposals',
      type: 'Customer',
      referenceId: customer._id,
      parentFolder: folder._id,
      tenant: tenantId,
    });

    console.log(`Auto-created Google Drive folder structure for customer: ${customer.companyName}`);
  } catch (err) {
    console.error('Google Drive folder auto-creation failed:', err.message);
  }
};

module.exports = {
  getDriveFolders,
  createFolder,
  getFolderContents,
  uploadFile,
  deleteFile,
  autoCreateCustomerFolder,
};
