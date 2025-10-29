import cron from 'node-cron';
import User from '../models/user.models.js';

cron.schedule('*/11 * * * *', async () => {
    try {
        console.log('🕒 Cron job running: Checking for expired unverified users...');

        const expiredUsers = await User.find({
            otpExpiry: { $lt: Date.now() },
            otpVerify: { $ne: null }
        });

        if (expiredUsers.length === 0) {
            console.log('✅ No expired unverified users found.');
        }

        for (const user of expiredUsers) {
            await User.deleteOne({ _id: user._id });
            console.log(`❌ Deleted user: ${user.email} (OTP expired)`);
        }
    } catch (err) {
        console.error('❌ Error during cleanup of unverified users:', err);
    }
});
