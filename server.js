const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const { uuid } = require('uuidv4');
require('dotenv').config();
const app = express();

// config aws s3
const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_BUCKET_REGION
});

const upload = multer({
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('The file extension is invalid.'), false);
        }
    }
});

app.post('/upload', upload.array('image'), (req, res) => {
    // upload all files to aws s3 bucket
    const promises = req.files.map((file) => {
        const fileExt = file.mimetype.split('/')[1];
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${uuid()}.${fileExt}`,
            Body: file.buffer
        }

        return new Promise((resolve, reject) => {
            S3.upload(params, (err, data) => {
                if (!err) {
                    resolve(data);
                } else {
                    reject(err);
                }
            });
        });
    });

    // wait for all files upload to aws s3 bucket complete
    Promise.all(promises)
        .then((result) => {
            const fileName = result.map((resultFromAWS) => resultFromAWS.key);
            res.status(200).json({fileName: fileName});
        })
        .catch((err) => {
            res.status(500).json(err);
        });
});

app.get('/image/:key' , (req , res) => {
    const dowloadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.params.key
    }
    // dowload file image from aws s3 bucket and read file stream
    const result = S3.getObject(dowloadParams).createReadStream();
    // send image to response
    result.pipe(res);
});

app.listen(5000, () => {
    console.log('Starting server...');
});