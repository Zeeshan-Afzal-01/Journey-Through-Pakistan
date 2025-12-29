import mongoose from 'mongoose';
import { config } from 'dotenv';
import Conversation from '../models/conversation.models.js';
import '../connection.js';

config({ path: "./.env" });

async function dropOldIndex() {
  try {
    // Wait for connection
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });

    console.log('Connected to MongoDB');
    
    // Get the collection
    const collection = mongoose.connection.db.collection('conversations');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Try to drop the old unique index
    try {
      await collection.dropIndex('participants_1');
      console.log('✅ Successfully dropped old unique index: participants_1');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  Index participants_1 does not exist (already dropped or never created)');
      } else {
        throw error;
      }
    }
    
    // List indexes again to confirm
    const indexesAfter = await collection.indexes();
    console.log('Indexes after drop:', indexesAfter.map(idx => ({ name: idx.name, key: idx.key })));
    
    console.log('✅ Index cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping index:', error);
    process.exit(1);
  }
}

dropOldIndex();

