package expo.modules.soundtrailaudio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CoverColorTest {
  @Test
  fun vividPixelsOutweighGrayOnes() {
    val pixels = IntArray(10) { 0xFF808080.toInt() } + IntArray(2) { 0xFFFF0000.toInt() }
    val color = CoverColor.pick(pixels)!!
    assertTrue(color, color.substring(1, 3).toInt(16) > 0xE0)
    assertTrue(color, color.substring(3, 5).toInt(16) < 0x30)
  }

  @Test
  fun keepsGrayCoversGray() {
    assertEquals("#808080", CoverColor.pick(IntArray(4) { 0xFF808080.toInt() }))
    assertNull(CoverColor.pick(IntArray(0)))
  }
}
