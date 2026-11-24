import os
import uuid
import secrets
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_migrate import Migrate
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models import db, Shopkeeper, Frame

# ---------- CONFIG ----------
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///spectacles.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Base uploads folder (absolute)
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')

# Optional: allowed extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'glb', 'gltf'}

# ---------- DB ----------
db.init_app(app)
migrate = Migrate(app, db)

# ---------- Helpers ----------
def allowed_file(filename):
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_username(username):
    # use secure_filename to sanitize username for folder creation (drops bad chars)
    return secure_filename(username)

def get_user_upload_folder(username):
    """Return the absolute path to a user's upload folder. Create if missing."""
    safe_user = safe_username(username)
    folder = os.path.join(app.config['UPLOAD_FOLDER'], safe_user)
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)
    return folder

def delete_file_if_exists(username, filename):
    """Delete a file from user's folder if it exists."""
    if not filename:
        return
    path = os.path.join(get_user_upload_folder(username), filename)
    if os.path.exists(path) and os.path.isfile(path):
        try:
            os.remove(path)
        except Exception:
            pass

def save_file_to_user_folder(user_folder, file_obj, prefix):
    """Save uploaded file object to user folder using secure filename and uuid to avoid collisions.
       Returns saved filename or None.
    """
    if not file_obj or file_obj.filename == '':
        return None
    if not allowed_file(file_obj.filename):
        return None
    original = secure_filename(file_obj.filename)
    unique = f"{prefix}_{uuid.uuid4().hex}_{original}"
    dest = os.path.join(user_folder, unique)
    file_obj.save(dest)
    return unique

def get_shopkeeper_from_secret(secret_key):
    if not secret_key:
        return None
    return Shopkeeper.query.filter_by(secret_key=secret_key).first()

# ---------- Routes ----------
@app.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    required = ('username', 'password')
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing data (username and password required)'}), 400

    username = data['username'].strip()
    password = data['password']

    if Shopkeeper.query.filter_by(username=username).first():
        return jsonify({'error': 'Username taken'}), 400

    # generate a secure random secret_key
    secret_key = secrets.token_urlsafe(32)

    shopkeeper = Shopkeeper(username=username, secret_key=secret_key)
    shopkeeper.set_password(password)
    db.session.add(shopkeeper)
    db.session.commit()

    # Create user-specific upload folder (safe name)
    get_user_upload_folder(username)

    return jsonify({
        'message': 'Shopkeeper registered',
        'username': shopkeeper.username,
        # return secret_key only if you want client to store it (be careful)
        'secret_key': shopkeeper.secret_key
    }), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    shopkeeper = Shopkeeper.query.filter_by(username=username).first()
    if shopkeeper and shopkeeper.check_password(password):
        return jsonify({
            'message': 'Login successful',
            'secret_key': shopkeeper.secret_key,
            'username': shopkeeper.username
        }), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/frames', methods=['POST'])
def add_frame():
    # Authentication via Secret-Key header
    secret_key = request.headers.get('Secret-Key')
    shopkeeper = get_shopkeeper_from_secret(secret_key)
    if not shopkeeper:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.form or {}
    if not all(k in data for k in ('frame_id', 'name', 'frame_type')):
        return jsonify({'error': 'Missing frame data'}), 400

    frame_id = data['frame_id'].strip()
    # check if same frame_id exists for this shopkeeper
    existing = Frame.query.filter_by(frame_id=frame_id, shopkeeper_id=shopkeeper.id).first()
    if existing:
        return jsonify({'error': 'Frame ID already exists for this user'}), 400

    user_folder = get_user_upload_folder(shopkeeper.username)

    # helper to save uploaded files
    front_img = save_file_to_user_folder(user_folder, request.files.get('front_img'), f"{frame_id}_front")
    left_temple_img = save_file_to_user_folder(user_folder, request.files.get('left_temple_img'), f"{frame_id}_left")
    right_temple_img = save_file_to_user_folder(user_folder, request.files.get('right_temple_img'), f"{frame_id}_right")
    model_3d_file = save_file_to_user_folder(user_folder, request.files.get('model_3d_file'), f"{frame_id}_model")
    frame = Frame(
        frame_id=frame_id,
        name=data['name'],
        frame_type=data['frame_type'],
        front_img=front_img,
        left_temple_img=left_temple_img,
        right_temple_img=right_temple_img,
        model_3d_file=model_3d_file,
        shopkeeper_id=shopkeeper.id
    )
    db.session.add(frame)
    db.session.commit()

    return jsonify({'message': 'Frame added'}), 201

@app.route('/frames', methods=['GET'])
def list_frames():
    # Auth
    secret_key = request.headers.get('Secret-Key')
    shopkeeper = get_shopkeeper_from_secret(secret_key)
    if not shopkeeper:
        return jsonify({'error': 'Unauthorized'}), 401

    frame_id = request.args.get('frame_id', '').strip()
    name = request.args.get('name', '').strip()

    query = Frame.query.filter(Frame.shopkeeper_id == shopkeeper.id)
    if frame_id:
        query = query.filter(Frame.frame_id.ilike(f"%{frame_id}%"))
    if name:
        query = query.filter(Frame.name.ilike(f"%{name}%"))

    frames = query.all()
    frames_data = []
    
    
    for f in frames:
        # Construct the file paths
        user_upload_path = f"/uploads/{shopkeeper.username}/"
        frames_data.append({
        'frame_id': f.frame_id,
        'name': f.name,
        'frame_type': f.frame_type,
        'front_img': f.front_img and f"{user_upload_path}{f.front_img}",
        'left_temple_img': f.left_temple_img and f"{user_upload_path}{f.left_temple_img}",
        'right_temple_img': f.right_temple_img and f"{user_upload_path}{f.right_temple_img}",
        # NEW: Return the path for the 3D model file
        'model_3d_file': f.model_3d_file and f"{user_upload_path}{f.model_3d_file}", 
        })




    return jsonify(frames_data), 200

@app.route('/frames/<frame_id>', methods=['DELETE'])
def delete_frame(frame_id):
    secret_key = request.headers.get('Secret-Key')
    shopkeeper = get_shopkeeper_from_secret(secret_key)
    if not shopkeeper:
        return jsonify({'error': 'Unauthorized'}), 401

    frame = Frame.query.filter_by(frame_id=frame_id, shopkeeper_id=shopkeeper.id).first()
    if not frame:
        return jsonify({'error': 'Frame not found'}), 404

    # Delete images from user folder
    delete_file_if_exists(shopkeeper.username, frame.front_img)
    delete_file_if_exists(shopkeeper.username, frame.left_temple_img)
    delete_file_if_exists(shopkeeper.username, frame.right_temple_img)
    delete_file_if_exists(shopkeeper.username, frame.model_3d_file)
    db.session.delete(frame)
    db.session.commit()
    return jsonify({'message': f'Frame {frame_id} deleted'}), 200

@app.route('/frames/<frame_id>', methods=['PUT'])
def update_frame(frame_id):
    secret_key = request.headers.get('Secret-Key')
    shopkeeper = get_shopkeeper_from_secret(secret_key)
    if not shopkeeper:
        return jsonify({'error': 'Unauthorized'}), 401

    frame = Frame.query.filter_by(frame_id=frame_id, shopkeeper_id=shopkeeper.id).first()
    if not frame:
        return jsonify({'error': 'Frame not found'}), 404

    data = request.form or {}
    user_folder = get_user_upload_folder(shopkeeper.username)

    # Update text fields if present
    if 'name' in data:
        frame.name = data['name']
    if 'frame_type' in data:
        frame.frame_type = data['frame_type']

    # Update images if new ones uploaded; delete old files
    front_img_file = request.files.get('front_img')
    if front_img_file:
        # remove previous
        delete_file_if_exists(shopkeeper.username, frame.front_img)
        frame.front_img = save_file_to_user_folder(user_folder, front_img_file, f"{frame_id}_front")

    left_temple_file = request.files.get('left_temple_img')
    if left_temple_file:
        delete_file_if_exists(shopkeeper.username, frame.left_temple_img)
        frame.left_temple_img = save_file_to_user_folder(user_folder, left_temple_file, f"{frame_id}_left")

    right_temple_file = request.files.get('right_temple_img')
    if right_temple_file:
        delete_file_if_exists(shopkeeper.username, frame.right_temple_img)
        frame.right_temple_img = save_file_to_user_folder(user_folder, right_temple_file, f"{frame_id}_right")
    model_3d_file_upload = request.files.get('model_3d_file')
    if model_3d_file_upload:
        delete_file_if_exists(shopkeeper.username, frame.model_3d_file)
        frame.model_3d_file = save_file_to_user_folder(user_folder, model_3d_file_upload, f"{frame_id}_model")
    db.session.commit()
    return jsonify({'message': f'Frame {frame_id} updated'}), 200



@app.route('/uploads/<username>/<filename>')
def uploaded_file(username, filename):
    user_folder = get_user_upload_folder(username)
    safe_name = secure_filename(filename)
    file_path = os.path.join(user_folder, safe_name)
    if not os.path.exists(file_path):
        return abort(404)
    return send_from_directory(user_folder, safe_name)

# On startup ensure DB created
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
