import { NextResponse } from "next/server";
import { refreshService } from "@/modules/auth/service";

/**
 * POST /api/auth/refresh
 * Generate access token baru dari refresh token yang valid.
 *
 * Body: { refreshToken: string }
 * Response: { success: true, data: { accessToken: string } }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { success: false, message: "Refresh token wajib disertakan." },
        { status: 400 },
      );
    }

    // Generate access token baru melalui service
    const result = await refreshService(refreshToken);

    return NextResponse.json(
      {
        success: true,
        data: { accessToken: result.accessToken },
      },
      { status: 200 },
    );
  } catch (error) {
    // Tentukan status code berdasarkan jenis error
    const authErrors = [
      "Refresh token tidak valid atau sudah kadaluarsa.",
      "Refresh token tidak dikenali. Silakan login kembali.",
      "Refresh token sudah kadaluarsa. Silakan login kembali.",
      "Refresh token tidak ditemukan.",
    ];

    const isAuthError = authErrors.includes(error.message);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat refresh token.",
      },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
