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
DEFAULT_MESSAGE_DURATION = 60

def make_temp_message_payload(message_id, message):
    return {
        "message_id": message_id,
        "message": message["message"],
        "username": message["user"],
        "timeStamp": message["timestamp"],
        "duration": message["duration"]
    }

def start_temp_message_countdown(message_id):
    if message_id not in temp_messages_db:
        return

    duration = temp_messages_db[message_id]["duration"]

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

@app.route("/")
def index():
    return render_template("index.html")

#evento para manejar la conexion de un nuevo client
@socketio.on("connect")
def handle_connect():
    print(f'Nuevo cliente conectado {request.sid}')
    emit("user_list", {"users": list(usuarios.values())})

@socketio.on("set_username")
def handle_set_username(data):
    username = data.get('username')
    if not username:
        return

    usuarios[request.sid] = username
    emit("user_joined", {"username": username}, broadcast=True, include_self=False)
    user_list = {"users": list(usuarios.values())}
    emit("user_list", user_list)
    emit("user_list", user_list, broadcast=True, include_self=False)

    for message_id, message in list(temp_messages_db.items()):
        emit("temp_message", make_temp_message_payload(message_id, message))

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

    temp_messages_db[message_id] = {
        "message": data.get("message"),
        "user": usuarios.get(request.sid),
        "timestamp": data.get("timeStamp"),
        "duration": DEFAULT_MESSAGE_DURATION,
        "sender_sid": request.sid,
        "timer": None
    }

    emit("temp_message", make_temp_message_payload(message_id, temp_messages_db[message_id]), broadcast=True)
    start_temp_message_countdown(message_id)

if __name__ == "__main__":
    socketio.run(app, host="localhost", port=5000, debug=True)
