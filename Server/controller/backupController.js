import Backup from '../models/backup.models.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Get database name from connection string
const getDatabaseName = () => {
  const uri = process.env.MONGODB_URI || process.env.URL || '';
  const match = uri.match(/\/([^?]+)/);
  return match ? match[1] : 'journey-through-pakistan';
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Create database backup
export const createBackup = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dbName = getDatabaseName();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Get all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name).filter(name => !name.startsWith('system.'));

    const backupData = {
      database: dbName,
      timestamp: new Date().toISOString(),
      collections: {}
    };

    // Export each collection
    for (const collectionName of collectionNames) {
      try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        backupData.collections[collectionName] = documents;
      } catch (error) {
        console.error(`Error backing up collection ${collectionName}:`, error);
      }
    }

    // Write backup to file
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    const stats = fs.statSync(filepath);
    const fileSize = stats.size;

    // Save backup record to database
    const backup = await Backup.create({
      filename,
      filepath,
      size: fileSize,
      type: 'manual',
      status: 'completed',
      createdBy: adminId,
      collections: collectionNames,
      description: `Manual backup created on ${new Date().toLocaleString()}`
    });

    // Log security event
    try {
      const { createSecurityLog } = await import('./securityLogController.js');
      const { getClientIP } = await import('../utils/getClientIP.js');
      await createSecurityLog({
        eventType: 'backup_created',
        adminId: adminId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        description: `Backup created: ${filename} (${formatFileSize(fileSize)})`,
        severity: 'medium',
        status: 'success',
        details: {
          backupId: backup._id,
          filename: filename,
          size: fileSize,
          collections: collectionNames.length
        }
      });
    } catch (logError) {
      console.error('Error logging backup creation:', logError);
    }

    res.json({
      success: true,
      message: "Backup created successfully",
      backup: {
        _id: backup._id,
        filename: backup.filename,
        size: formatFileSize(backup.size),
        createdAt: backup.createdAt,
        collections: backup.collections
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ 
      message: "Failed to create backup", 
      error: error.message 
    });
  }
};

// Get all backups
export const getBackups = async (req, res) => {
  try {
    const backups = await Backup.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    const backupsWithFormattedSize = backups.map(backup => ({
      ...backup,
      sizeFormatted: formatFileSize(backup.size),
      fileExists: fs.existsSync(backup.filepath)
    }));

    res.json(backupsWithFormattedSize);
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ 
      message: "Failed to fetch backups", 
      error: error.message 
    });
  }
};

// Download backup
export const downloadBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await Backup.findById(id);

    if (!backup) {
      return res.status(404).json({ message: "Backup not found" });
    }

    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    
    const fileStream = fs.createReadStream(backup.filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ 
      message: "Failed to download backup", 
      error: error.message 
    });
  }
};

// Delete backup
export const deleteBackup = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const backup = await Backup.findById(id);

    if (!backup) {
      return res.status(404).json({ message: "Backup not found" });
    }

    // Delete file if exists
    if (fs.existsSync(backup.filepath)) {
      fs.unlinkSync(backup.filepath);
    }

    // Delete record
    await Backup.findByIdAndDelete(id);

    // Log security event
    try {
      const { createSecurityLog } = await import('./securityLogController.js');
      const { getClientIP } = await import('../utils/getClientIP.js');
      await createSecurityLog({
        eventType: 'backup_deleted',
        adminId: adminId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        description: `Backup deleted: ${backup.filename}`,
        severity: 'medium',
        status: 'success',
        details: {
          backupId: id,
          filename: backup.filename
        }
      });
    } catch (logError) {
      console.error('Error logging backup deletion:', logError);
    }

    res.json({
      success: true,
      message: "Backup deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ 
      message: "Failed to delete backup", 
      error: error.message 
    });
  }
};

// Restore backup
export const restoreBackup = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const backup = await Backup.findById(id);

    if (!backup) {
      return res.status(404).json({ message: "Backup not found" });
    }

    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backup.filepath, 'utf8'));
    const db = mongoose.connection.db;

    // Restore each collection
    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      try {
        const collection = db.collection(collectionName);
        
        // Clear existing collection
        await collection.deleteMany({});
        
        // Insert documents
        if (documents && documents.length > 0) {
          await collection.insertMany(documents);
        }
      } catch (error) {
        console.error(`Error restoring collection ${collectionName}:`, error);
        return res.status(500).json({ 
          message: `Failed to restore collection ${collectionName}`, 
          error: error.message 
        });
      }
    }

    // Log security event (CRITICAL - data restore)
    try {
      const { createSecurityLog } = await import('./securityLogController.js');
      const { getClientIP } = await import('../utils/getClientIP.js');
      await createSecurityLog({
        eventType: 'backup_restored',
        adminId: adminId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        description: `CRITICAL: Database restored from backup: ${backup.filename}`,
        severity: 'critical',
        status: 'success',
        details: {
          backupId: id,
          filename: backup.filename,
          collections: Object.keys(backupData.collections)
        }
      });
    } catch (logError) {
      console.error('Error logging backup restore:', logError);
    }

    res.json({
      success: true,
      message: "Backup restored successfully"
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ 
      message: "Failed to restore backup", 
      error: error.message 
    });
  }
};

// Upload and restore backup file
export const uploadAndRestoreBackup = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No backup file uploaded" });
    }

    const filepath = req.file.path;
    const stats = fs.statSync(filepath);
    const fileSize = stats.size;

    // Read and validate backup file
    let backupData;
    try {
      backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (error) {
      fs.unlinkSync(filepath); // Delete invalid file
      return res.status(400).json({ message: "Invalid backup file format" });
    }

    if (!backupData.collections || typeof backupData.collections !== 'object') {
      fs.unlinkSync(filepath);
      return res.status(400).json({ message: "Invalid backup file structure" });
    }

    // Save backup record
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `restored_${timestamp}.json`;
    const newFilepath = path.join(backupDir, filename);
    
    // Move uploaded file to backup directory
    fs.renameSync(filepath, newFilepath);

    const backup = await Backup.create({
      filename,
      filepath: newFilepath,
      size: fileSize,
      type: 'manual',
      status: 'completed',
      createdBy: adminId,
      collections: Object.keys(backupData.collections),
      description: `Restored from uploaded file on ${new Date().toLocaleString()}`
    });

    // Restore database
    const db = mongoose.connection.db;
    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      try {
        const collection = db.collection(collectionName);
        await collection.deleteMany({});
        if (documents && documents.length > 0) {
          await collection.insertMany(documents);
        }
      } catch (error) {
        console.error(`Error restoring collection ${collectionName}:`, error);
        return res.status(500).json({ 
          message: `Failed to restore collection ${collectionName}`, 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: "Backup uploaded and restored successfully",
      backup: {
        _id: backup._id,
        filename: backup.filename,
        size: formatFileSize(backup.size),
        createdAt: backup.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading and restoring backup:', error);
    res.status(500).json({ 
      message: "Failed to upload and restore backup", 
      error: error.message 
    });
  }
};

