import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Multer setup for handling optional profile picture
const storage = multer.diskStorage(
    {
        destination: function (req, file, cb)
        {
            const email = req.body.email;
            // Ensure uploads directory exists and serve it statically
            const uploadPath = path.join(__dirname, "..", "uploads");
            const uploadsDir = path.join(uploadPath, email);
            if (!fs.existsSync(uploadsDir)) 
            {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            return cb(null, uploadsDir);

        },

        filename: function (req, file, cb)
        {
            const fname = req.body.name;
            const fullname = fname + "-" + file.originalname;

            return cb(null, fullname);
        }
    }
)

const upload = multer({storage});

export default upload;




// if (!username) {
//     console.error("Username is missing in URL parameters and request body");
//     return cb(new Error("Username is missing in URL parameters and request body"), null);
//   }
//   // Create uploads directory in the project root
//   const uploadPath = path.join(__dirname, "..", "uploads");
//   const userUploadPath = path.join(uploadPath, username);
//   console.log("Base upload path:", uploadPath);
//   console.log("User upload path:", userUploadPath);
//   // Create base uploads directory if it doesn't exist
//   if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
//     console.log("Created base upload directory:", uploadPath);
//   }
//   // Create user-specific directory if it doesn't exist
//   if (!fs.existsSync(userUploadPath)) {
//     fs.mkdirSync(userUploadPath, { recursive: true });
//     console.log("Created user upload directory:", userUploadPath);
//   }