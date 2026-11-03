package expo.modules.soundtrailaudio

object MediaPaths {
  fun relativePath(folder: String): String? {
    val path = folder.trim('/', ' ')
    if (path.isEmpty() || path.split('/').any { it.isBlank() || it == "." || it == ".." }) return null
    return "$path/"
  }

  fun fileName(name: String): String? = name.trim().takeIf { it.isNotEmpty() && !it.contains('/') }
}
