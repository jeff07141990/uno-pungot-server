package com.unopungot.game;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableEdgeToEdgeDisplay();
        hideSystemBars();
        requestAudioPermissions();
        configureWebView();
    }

    private void enableEdgeToEdgeDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }

    private void configureWebView() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                final android.webkit.WebView webView = this.bridge.getWebView();
                android.webkit.WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setSupportMultipleWindows(true);

                // Enable third-party cookies for Firebase OAuth state
                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // Handle window.open() popups spawned by Firebase Auth while preserving Capacitor's file chooser & media capture
                webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(this.bridge) {
                    @Override
                    public boolean onCreateWindow(android.webkit.WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                        final android.app.Dialog authDialog = new android.app.Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                        final android.webkit.WebView popupWebView = new android.webkit.WebView(MainActivity.this);
                        
                        android.webkit.WebSettings popupSettings = popupWebView.getSettings();
                        popupSettings.setJavaScriptEnabled(true);
                        popupSettings.setDomStorageEnabled(true);
                        popupSettings.setDatabaseEnabled(true);
                        popupSettings.setSupportMultipleWindows(true);
                        popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);

                        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                        popupWebView.setWebChromeClient(new android.webkit.WebChromeClient() {
                            @Override
                            public void onCloseWindow(android.webkit.WebView window) {
                                try {
                                    authDialog.dismiss();
                                    popupWebView.destroy();
                                } catch (Exception ignored) {}
                            }
                        });

                        popupWebView.setWebViewClient(new android.webkit.WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(android.webkit.WebView v, android.webkit.WebResourceRequest request) {
                                return false;
                            }
                        });

                        authDialog.setContentView(popupWebView);
                        authDialog.show();

                        android.webkit.WebView.WebViewTransport transport = (android.webkit.WebView.WebViewTransport) resultMsg.obj;
                        transport.setWebView(popupWebView);
                        resultMsg.sendToTarget();
                        return true;
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    private void requestAudioPermissions() {
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[] {
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.MODIFY_AUDIO_SETTINGS
                    },
                    PERMISSION_REQ_CODE
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            // Android 10 and below immersive sticky
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}

