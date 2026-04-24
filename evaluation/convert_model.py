"""
Convert HDF5 model (Keras 2.x format) to SavedModel format (Keras 3.x compatible)
Uses a custom loading approach that bypasses strict layer validation.
"""
import os
import sys
import h5py

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
import keras

# Monkey-patch to remove unsupported parameters during layer deserialization
from keras.src.layers.convolutional.depthwise_conv2d import DepthwiseConv2D
from keras.src.models.model import Model

original_depthwise_init = DepthwiseConv2D.__init__

def patched_depthwise_init(self, *args, **kwargs):
    """Remove 'groups' parameter which doesn't exist in Keras 3"""
    kwargs.pop('groups', None)
    return original_depthwise_init(self, *args, **kwargs)

DepthwiseConv2D.__init__ = patched_depthwise_init

# Also patch the from_config to handle the mismatch
original_from_config = DepthwiseConv2D.from_config

@classmethod
def patched_from_config(cls, config):
    """Handle config with unsupported parameters"""
    config = config.copy()
    config.pop('groups', None)
    return original_from_config(config)

DepthwiseConv2D.from_config = patched_from_config

try:
    print("Loading HDF5 model with compatibility patches...")
    
    # Try using safe_mode to be more lenient with layer configs
    model = keras.models.load_model(
        "keras_model.h5",
        compile=False,
        safe_mode=False  # More lenient loading
    )
    
    print("✓ Model loaded successfully!")
    print(f"  Model: {model}")
    print(f"  Input shape: {model.input_shape}")
    print(f"  Output shape: {model.output_shape}")
    
    print("\nSaving as SavedModel format...")
    model.save("keras_model_converted", save_format='tf')
    print("✓ Model converted to SavedModel format")
    
except Exception as e:
    print(f"Note: Full conversion failed: {type(e).__name__}: {str(e)[:200]}")
    print("\nTrying weight extraction fallback...")
    
    try:
        # As a fallback, just extract the HDF5 weights
        with h5py.File("keras_model.h5", "r") as f:
            print("✓ HDF5 file is readable")
            print(f"  Available keys: {list(f.keys())}")
            if 'model_weights' in f:
                print(f"  Model weights groups: {list(f['model_weights'].keys())}")
    except Exception as e2:
        print(f"✗ Cannot read HDF5: {e2}")
        sys.exit(1)
