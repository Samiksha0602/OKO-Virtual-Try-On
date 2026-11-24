import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import FaceAnchoringAR from "./FaceAnchoringAR";

function isValidFileType(file) {
  const allowedMime = [
    "image/jpeg", 
    "image/png", 
    "image/webp",
    "model/gltf-binary",
    "application/octet-stream",
  ];
  if (allowedMime.includes(file.type)) return true;
  const ext = file.name.split('.').pop().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "glb", "gltf"].includes(ext);
}

const Dashboard = ({ secretKey, username, onLogout }) => {
  const [frames, setFrames] = useState([]);
  const [form, setForm] = useState({
    frame_id: "",
    name: "",
    frame_type: "single-color",
    front_img: null,
    left_temple_img: null,
    right_temple_img: null,
    model_3d_file: null,
  });
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState({
    front_img: null,
    left_temple_img: null,
    right_temple_img: null,
    model_3d_file: null,
  });
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    frame_type: "single-color",
    front_img: null,
    left_temple_img: null,
    right_temple_img: null,
    model_3d_file: null,
  });
  const [editPreview, setEditPreview] = useState({
    front_img: null,
    left_temple_img: null,
    right_temple_img: null,
    model_3d_file: null,
  });

  const [activeCameraFrame, setActiveCameraFrame] = useState(null);
  const [faceAnchoringActive, setFaceAnchoringActive] = useState(false);
  const [arFrameData, setArFrameData] = useState(null);
  
  const webcamRef = useRef(null);

  const fetchFrames = useCallback(
    async (id = "", name = "") => {
      try {
        const params = {};
        if (id) params.frame_id = id;
        if (name) params.name = name;
        const res = await axios.get("http://localhost:5000/frames", {
          headers: { "Secret-Key": secretKey },
          params,
        });
        setFrames(res.data);
      } catch {
        setMessage("Failed to fetch frames");
      }
    },
    [secretKey]
  );

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  const handleChange = (e) => {
    const { name, files, value } = e.target;
    if (files) {
      const file = files[0];
      if (!file) return;

      if (!isValidFileType(file)) {
        setMessage(`Invalid file type for ${name}. Allowed: jpg, png, webp, glb, gltf.`);
        setForm((f) => ({ ...f, [name]: null }));
        setPreview((p) => ({ ...p, [name]: null }));
        return;
      }
      setForm((f) => ({ ...f, [name]: file }));
      setPreview((p) => ({ ...p, [name]: URL.createObjectURL(file) }));
      setMessage("");
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const submitNew = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("frame_id", form.frame_id);
    fd.append("name", form.name);
    fd.append("frame_type", form.frame_type);
    if (form.front_img) fd.append("front_img", form.front_img);
    if (form.left_temple_img) fd.append("left_temple_img", form.left_temple_img);
    if (form.right_temple_img) fd.append("right_temple_img", form.right_temple_img);
    if (form.model_3d_file) fd.append("model_3d_file", form.model_3d_file);
    
    try {
      const res = await axios.post("http://localhost:5000/frames", fd, {
        headers: {
          "Secret-Key": secretKey,
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(res.data.message);
      setForm({
        frame_id: "",
        name: "",
        frame_type: "single-color",
        front_img: null,
        left_temple_img: null,
        right_temple_img: null,
        model_3d_file: null,
      });
      setPreview({
        front_img: null,
        left_temple_img: null,
        right_temple_img: null,
        model_3d_file: null,
      });
      fetchFrames();
    } catch (e) {
      setMessage("Error adding frame.");
    }
  };

  const startEdit = (frame) => {
    setEditId(frame.frame_id);
    setEditForm({
      name: frame.name,
      frame_type: frame.frame_type,
      front_img: null,
      left_temple_img: null,
      right_temple_img: null,
      model_3d_file: null,
    });
    setEditPreview({
      front_img: frame.front_img ? `http://localhost:5000${frame.front_img}` : null,
      left_temple_img: frame.left_temple_img ? `http://localhost:5000${frame.left_temple_img}` : null,
      right_temple_img: frame.right_temple_img ? `http://localhost:5000${frame.right_temple_img}` : null,
      model_3d_file: frame.model_3d_file ? `http://localhost:5000${frame.model_3d_file}` : null,
    });
    setMessage("");
  };

  const editChange = (e) => {
    const { name, files, value } = e.target;
    if (files) {
      const file = files[0];
      if (!file) return;

      if (!isValidFileType(file)) {
        setMessage(`Invalid file type for ${name}. Allowed: jpg, png, webp, glb, gltf.`);
        setEditForm((f) => ({ ...f, [name]: null }));
        setEditPreview((p) => ({ ...p, [name]: null }));
        return;
      }
      setEditForm((f) => ({ ...f, [name]: file }));
      setEditPreview((p) => ({ ...p, [name]: URL.createObjectURL(file) }));
      setMessage("");
    } else {
      setEditForm((f) => ({ ...f, [name]: value }));
    }
  };

  const saveEdit = async () => {
    const fd = new FormData();
    fd.append("name", editForm.name);
    fd.append("frame_type", editForm.frame_type);
    if (editForm.front_img instanceof File) fd.append("front_img", editForm.front_img);
    if (editForm.left_temple_img instanceof File) fd.append("left_temple_img", editForm.left_temple_img);
    if (editForm.right_temple_img instanceof File) fd.append("right_temple_img", editForm.right_temple_img);
    if (editForm.model_3d_file instanceof File) fd.append("model_3d_file", editForm.model_3d_file);
    
    try {
      const res = await axios.put(`http://localhost:5000/frames/${editId}`, fd, {
        headers: { "Content-Type": "multipart/form-data", "Secret-Key": secretKey },
      });
      setMessage(res.data.message);
      setEditId(null);
      fetchFrames();
    } catch {
      setMessage("Error updating frame.");
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({
      name: "",
      frame_type: "single-color",
      front_img: null,
      left_temple_img: null,
      right_temple_img: null,
      model_3d_file: null,
    });
    setEditPreview({
      front_img: null,
      left_temple_img: null,
      right_temple_img: null,
      model_3d_file: null,
    });
    setMessage("");
  };

  const deleteFrame = async (id) => {
    if (!window.confirm("Delete this frame?")) return;
    try {
      const res = await axios.delete(`http://localhost:5000/frames/${id}`, {
        headers: { "Secret-Key": secretKey },
      });
      setMessage(res.data.message);
      fetchFrames();
    } catch {
      setMessage("Error deleting frame.");
    }
  };

  // Handle stopping AR mode
  const handleStopAR = () => {
    setFaceAnchoringActive(false);
    setArFrameData(null);
  };

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Dashboard {faceAnchoringActive && `- AR Mode: ${arFrameData?.name}`}</h2>
        <div>
          {faceAnchoringActive && (
            <button
              className="btn btn-secondary me-2"
              onClick={handleStopAR}
            >
              ← Back to Dashboard
            </button>
          )}
          <button className="btn btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {faceAnchoringActive && arFrameData ? (
        <FaceAnchoringAR 
          key={arFrameData.frame_id}
          arFrameData={arFrameData}
          onStopAR={handleStopAR}
        />
      ) : (
        <>
          {/* Add frame form */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Add New Frame</h5>
            </div>
            <div className="card-body">
              <form onSubmit={submitNew}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Frame ID *</label>
                    <input
                      className="form-control"
                      name="frame_id"
                      placeholder="e.g., FR-001"
                      value={form.frame_id}
                      onChange={handleChange}
                      required
                      disabled={editId !== null}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Frame Name *</label>
                    <input
                      className="form-control"
                      name="name"
                      placeholder="e.g., Classic Aviator"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Frame Type *</label>
                  <select
                    className="form-select"
                    name="frame_type"
                    value={form.frame_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="single-color">Single Color</option>
                    <option value="multi-color">Multi Color</option>
                  </select>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Left Temple Image</label>
                    <input
                      className="form-control"
                      type="file"
                      name="left_temple_img"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleChange}
                    />
                    {preview.left_temple_img && (
                      <img
                        src={preview.left_temple_img}
                        alt="Left temple"
                        className="img-thumbnail mt-2"
                        style={{ maxWidth: "100px" }}
                      />
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Front Image</label>
                    <input
                      className="form-control"
                      type="file"
                      name="front_img"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleChange}
                    />
                    {preview.front_img && (
                      <img
                        src={preview.front_img}
                        alt="Front"
                        className="img-thumbnail mt-2"
                        style={{ maxWidth: "100px" }}
                      />
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Right Temple Image</label>
                    <input
                      className="form-control"
                      type="file"
                      name="right_temple_img"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleChange}
                    />
                    {preview.right_temple_img && (
                      <img
                        src={preview.right_temple_img}
                        alt="Right temple"
                        className="img-thumbnail mt-2"
                        style={{ maxWidth: "100px" }}
                      />
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">3D Model File (.glb) - Required for AR Try-On</label>
                  <input
                    className="form-control"
                    type="file"
                    name="model_3d_file"
                    accept=".glb,.gltf"
                    onChange={handleChange}
                  />
                  {form.model_3d_file && (
                    <div className="alert alert-success mt-2">
                      ✓ File selected: {form.model_3d_file.name}
                    </div>
                  )}
                </div>

                <button className="btn btn-primary btn-lg" type="submit" disabled={editId !== null}>
                  <i className="bi bi-plus-circle"></i> Add Frame
                </button>
              </form>
            </div>
          </div>

          {message && <div className="alert alert-info">{message}</div>}

          {/* Search form */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder="Search by Frame ID"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder="Search by Name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => fetchFrames(searchId, searchName)}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Frames list */}
          <div className="row">
            {frames.map((frame) => (
              <div key={frame.frame_id} className="col-12 mb-3">
                <div className="card shadow-sm">
                  <div className="card-body">
                    {editId === frame.frame_id ? (
                      <>
                        <h5 className="card-title">Editing: {frame.frame_id}</h5>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <label className="form-label">Name</label>
                            <input
                              className="form-control"
                              name="name"
                              value={editForm.name}
                              onChange={editChange}
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Type</label>
                            <select
                              className="form-select"
                              name="frame_type"
                              value={editForm.frame_type}
                              onChange={editChange}
                            >
                              <option value="single-color">Single Color</option>
                              <option value="multi-color">Multi Color</option>
                            </select>
                          </div>
                        </div>

                        <div className="row mb-3">
                          {["left_temple_img", "front_img", "right_temple_img"].map((imgKey) => (
                            <div key={imgKey} className="col-md-4">
                              <label className="form-label">
                                {imgKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </label>
                              <input
                                className="form-control"
                                type="file"
                                name={imgKey}
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={editChange}
                              />
                              {editPreview[imgKey] && (
                                <img
                                  src={editPreview[imgKey]}
                                  alt={imgKey}
                                  className="img-thumbnail mt-2"
                                  style={{ maxWidth: "100px" }}
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mb-3">
                          <label className="form-label">3D Model File</label>
                          <input
                            className="form-control"
                            type="file"
                            name="model_3d_file"
                            accept=".glb,.gltf"
                            onChange={editChange}
                          />
                          {frame.model_3d_file && (
                            <p className="text-muted mt-2">Current: {frame.model_3d_file.split('/').pop()}</p>
                          )}
                          {editForm.model_3d_file && (
                            <p className="text-success mt-2">New: {editForm.model_3d_file.name}</p>
                          )}
                        </div>

                        <button className="btn btn-success me-2" onClick={saveEdit}>
                          Save Changes
                        </button>
                        <button className="btn btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="card-title">
                              {frame.name} 
                              <span className="badge bg-secondary ms-2">{frame.frame_id}</span>
                              {frame.model_3d_file && (
                                <span className="badge bg-success ms-2">AR Ready</span>
                              )}
                            </h5>
                            <p className="card-text text-muted">Type: {frame.frame_type}</p>
                          </div>
                        </div>

                        <div className="row mb-3">
                          {frame.left_temple_img && (
                            <div className="col-md-3">
                              <small className="text-muted d-block">Left Temple</small>
                              <img
                                src={`http://localhost:5000${frame.left_temple_img}`}
                                alt="Left"
                                className="img-thumbnail"
                                style={{ maxWidth: "120px" }}
                              />
                            </div>
                          )}
                          {frame.front_img && (
                            <div className="col-md-3">
                              <small className="text-muted d-block">Front</small>
                              <img
                                src={`http://localhost:5000${frame.front_img}`}
                                alt="Front"
                                className="img-thumbnail"
                                style={{ maxWidth: "120px" }}
                              />
                            </div>
                          )}
                          {frame.right_temple_img && (
                            <div className="col-md-3">
                              <small className="text-muted d-block">Right Temple</small>
                              <img
                                src={`http://localhost:5000${frame.right_temple_img}`}
                                alt="Right"
                                className="img-thumbnail"
                                style={{ maxWidth: "120px" }}
                              />
                            </div>
                          )}

                          {activeCameraFrame === frame.frame_id && (
                            <div className="col-md-3">
                              <small className="text-muted d-block">Live Preview</small>
                              <Webcam
                                ref={webcamRef}
                                audio={false}
                                style={{
                                  width: "120px",
                                  height: "90px",
                                  borderRadius: "8px",
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-outline-primary" 
                            onClick={() => startEdit(frame)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-outline-danger" 
                            onClick={() => deleteFrame(frame.frame_id)}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-warning"
                            onClick={() => {
                              setArFrameData(frame);
                              setFaceAnchoringActive(true);
                            }}
                            disabled={!frame.model_3d_file}
                            title={!frame.model_3d_file ? "Upload 3D model first" : "Try on with AR"}
                          >
                            🕶️ Try On AR
                          </button>
                          <button
                            className="btn btn-info"
                            onClick={() =>
                              setActiveCameraFrame(
                                activeCameraFrame === frame.frame_id ? null : frame.frame_id
                              )
                            }
                          >
                            {activeCameraFrame === frame.frame_id ? "Stop Camera" : "Start Camera"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;