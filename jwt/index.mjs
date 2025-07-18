import jwt from 'jsonwebtoken';
import fs from 'fs';

const payload = {
    iss: "6f57f594-597d-466a-ac4f-2d308fc38410",
    sub: "6f57f594-597d-466a-ac4f-2d308fc38410",
    aud: " urn:oid:1.2.840.114350.1.13.0.1.7.3.688884.100",
    jti: "c5evjdku.ov1"
}

const privateKey = fs.readFileSync('./private.key');


const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS384',
    expiresIn: '24h'
});

console.log("Generated JWT:", token);