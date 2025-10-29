import jwt from 'jsonwebtoken';


export const verifyToken = (req, res, next)=> {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.appToken) {
        token = req.cookies.appToken;
    }

    if(!token) {
        return res.status(401).json({message: "Access Denied. No Token Provided."});
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        req.user = decoded;
        next();
    } catch(err) {
        res.status(401).json({message: "Invalid or Expired Token!"});
    }
}