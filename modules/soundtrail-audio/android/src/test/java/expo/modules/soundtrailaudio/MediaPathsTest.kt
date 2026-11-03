package expo.modules.soundtrailaudio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaPathsTest {
  @Test
  fun normalizesRelativeFolders() {
    assertEquals("Music/", MediaPaths.relativePath("Music"))
    assertEquals("Music/Daft Punk/Discovery/", MediaPaths.relativePath(" /Music/Daft Punk/Discovery/ "))
  }

  @Test
  fun rejectsEscapingOrEmptyFolders() {
    assertNull(MediaPaths.relativePath(""))
    assertNull(MediaPaths.relativePath("Music/../Android"))
    assertNull(MediaPaths.relativePath("Music/./x"))
    assertNull(MediaPaths.relativePath("Music//x"))
  }

  @Test
  fun checksFileNames() {
    assertEquals("Song", MediaPaths.fileName("  Song "))
    assertNull(MediaPaths.fileName("   "))
    assertNull(MediaPaths.fileName("a/b"))
  }
}
