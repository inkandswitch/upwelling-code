let app = require('./')

let port = 5001

app.listen(port, () => {
	console.log('listening on http://localhost:' + port)
})