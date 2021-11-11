# Simple HTTP sync server

This is a very simple Flask application which saves everything you post to it in the `./data` subdirectory. You can run it using [Pipenv](https://github.com/pypa/pipenv), like this:

```bash
mkdir data
pipenv install
pipenv run python server.py
```

Alternatively you will need a python installation with the `flask` and `flask_cors` packages installed, then you can just do `python server.py`
