from flask import Flask, render_template, request
from datetime import datetime
from flask_socketio import SocketIO, emit, send
# para los permisos
from flask_cors import CORS

#inicializar la aplicacion flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mi_clave_secreta'
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

usuarios = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/pene")
def pene():
    return render_template("pene.html")


#evento para manejar la conexion de un nuevo client
@socketio.on("connect")
def handle_connect():
    print(f'Nuevo cliente conectado {request.sid}')

@socketio.on("set_username")
def handle_set_username(data):
    username = data.get('username', 'Anonimo')
    usuarios[request.sid] = username
    emit("user_joined", {"username": username}, broadcast=True, include_self=False)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

@socketio.on("chat_message")
def handle_chat_message(data):
    username = usuarios.get(request.sid, "Anonimo")
    message = data.get("message", "")
    emit("chat_message", {"username": username, "message": message, "timeStamp": data.get("timeStamp")}, broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    username = usuarios.pop(request.sid, "Anonimo")
    print(f"Usuario desconectado: {request.sid} ({username})")
    emit("user_left", {"username": username}, broadcast=True)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="localhost", port=5000, debug=True)
