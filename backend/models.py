from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Shopkeeper(db.Model):
    __tablename__ = 'shopkeeper'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    secret_key = db.Column(db.String(128), nullable=False, unique=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Frame(db.Model):
    __tablename__ = 'frame'
    id = db.Column(db.Integer, primary_key=True)
    # frame_id is unique per shopkeeper (not globally)
    frame_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    frame_type = db.Column(db.String(20), nullable=False)
    front_img = db.Column(db.String(200))
    left_temple_img = db.Column(db.String(200))
    right_temple_img = db.Column(db.String(200))
    model_3d_file = db.Column(db.String(200)) # Stores the GLB/GLTF filename
    shopkeeper_id = db.Column(db.Integer, db.ForeignKey('shopkeeper.id'), nullable=False)
    owner = db.relationship('Shopkeeper', backref=db.backref('frames', lazy=True))

    __table_args__ = (
        # ensure frame_id + shopkeeper_id unique together
        db.UniqueConstraint('frame_id', 'shopkeeper_id', name='uix_frame_shopkeeper'),
    )

