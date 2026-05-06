from flask import Flask, render_template, request
from datetime import datetime
from flask_socketio import SocketIO, emit
# para los permisos
from flask_cors import CORS

#inicializar la aplicacion flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mi_clave_secreta'
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

usuarios = {}

temp_messages_db = {}

@app.route("/")
def index():
    return render_template("index.html")

#evento para manejar la conexion de un nuevo client
@socketio.on("connect")
def handle_connect():
    print(f'Nuevo cliente conectado {request.sid}')

@socketio.on("set_username")
def handle_set_username(data):
    username = data.get('username')
    usuarios[request.sid] = username
    emit("user_joined", {"username": username}, broadcast=True, include_self=False)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    username = usuarios.pop(request.sid, None)
    if not username:
        return

    print(f"Usuario desconectado: {request.sid} ({username})")
    emit("user_left", {"username": username}, broadcast=True)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

@socketio.on("temp_message")
def handle_temp_message(data):
    message_id = f"temp_{request.sid}_{datetime.now().timestamp()}"

    duration = data.get("duration", 10)

    temp_messages_db[message_id] = {
        "message": data.get("message"),
        "user": usuarios.get(request.sid),
        "timestamp": data.get("timeStamp"),
        "duration": duration,
        "read": False,
        "timer": None
    }

    emit("temp_message", {
        "message_id": message_id,
        "message": data.get("message"),
        "username": usuarios.get(request.sid),
        "timeStamp": data.get("timeStamp"),
        "duration": duration
    }, broadcast=True)

    def countdown():
        for i in range(duration, 0, -1):
            if message_id in temp_messages_db:
                socketio.emit("temp_message_countdown", {"messageId": message_id, "remaining": i - 1})
                socketio.sleep(1)

        if message_id in temp_messages_db:
            del temp_messages_db[message_id]
            socketio.emit("temp_message_deleted", {"messageId": message_id})

    timer_thread = socketio.start_background_task(countdown)
    temp_messages_db[message_id]["timer"] = timer_thread

if __name__ == "__main__":
    socketio.run(app, host="localhost", port=5000, debug=True)
