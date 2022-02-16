const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const bodyParser = require('body-parser');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
	endpoint: 'https://sfo3.digitaloceanspaces.com',
	region: 'sfo3',
	credentials: {
		accessKeyId: "FU6M64FABLBB5WQ4G5UM",
		secretAccessKey: process.env.SPACES_SECRET
	}
})


// Step 4: Define a function that uploads your object using SDK's PutObjectCommand object and catches any errors.
const uploadObject = async () => {
	try {
		const data = await s3Client.send(new PutObjectCommand(params));
		console.log(
			"Successfully uploaded object: " +
			params.Bucket +
			"/" +
			params.Key
		);
		return data;
	} catch (err) {
		console.log("Error", err);
	}
};

let app = express()
var options = {
	inflate: true,
	limit: '100kb',
	type: 'application/octet-stream'
};
app.use(bodyParser.raw(options));
app.use(cors());

try { 
	fs.mkdirSync(path.join(__dirname, 'data'))
} catch (err) {
	if (err.code !== 'EEXIST') {
		console.error(err)
	} 
}

app.get('/:id', (req, res) => {
	let id = req.params.id
	let filename = path.join(__dirname, 'data', id)
	fs.stat(filename, (err, stats) => {
		if (err) {
			console.error(err)
			res.status(404).send('Not found')
		} else { 
			res.sendFile(filename)
			console.log('sending')
		}
	})
})

app.post('/:id', (req, res) => {
	let id = req.params.id

	// Step 3: Define the parameters for the object you want to upload.
	const params = {
		Bucket: "upwelling-semi-reliable-storage/v1", // The path to the directory you want to upload the object to, starting with your Space name.
		Key: id, // Object key, referenced whenever you want to access this file later.
		Body: req.body, // The object's contents. This variable is an object, not a string.
		ACL: "public", // Defines ACL permissions, such as private or public.
		Metadata: { // Defines metadata tags.
			"id": id
		}
	};

	uploadObject(params).then(value => {
		res.status(200).send('ok')
	}).catch(err => {
		res.status(500).send(err.message)
	})
})

module.exports = app
