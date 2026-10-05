package com.studenthood.agesignals

import com.google.android.play.agesignals.AgeSignalsAccessRequest
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StudentHoodAgeSignalsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StudentHoodAgeSignals")

    AsyncFunction("requestAgeSignal") { _: Map<String, Any?>, promise: Promise ->
      val activity = appContext.currentActivity
      val context = appContext.reactContext

      if (activity == null || context == null) {
        promise.resolve(mapOf("status" to "unavailable"))
        return@AsyncFunction
      }

      val manager = AgeSignalsManagerFactory.create(context.applicationContext)
      val request = AgeSignalsAccessRequest.builder()
        .setActivity(activity)
        .build()

      manager.requestAgeSignalsAccess(request)
        .addOnSuccessListener { accessResult ->
          val status = accessResult.ageSignalsStatus()
          val shared = constantValue(
            "com.google.android.play.agesignals.model.AgeSignalsStatus",
            "SHARED"
          )
          val verificationRequired = constantValue(
            "com.google.android.play.agesignals.model.AgeSignalsStatus",
            "VERIFICATION_REQUIRED"
          )

          when {
            verificationRequired != null && status == verificationRequired -> {
              promise.resolve(mapOf("status" to "verification_required"))
            }
            shared != null && status == shared -> {
              manager.checkAgeSignals(AgeSignalsRequest.builder().build())
                .addOnSuccessListener { result ->
                  val source = sourceName(result.ageRangeSource())
                  promise.resolve(
                    mapOf(
                      "status" to "shared",
                      "ageLower" to result.ageLower(),
                      "ageUpper" to result.ageUpper(),
                      "source" to source
                    )
                  )
                }
                .addOnFailureListener {
                  promise.resolve(mapOf("status" to "unavailable"))
                }
            }
            else -> {
              promise.resolve(mapOf("status" to "not_shared"))
            }
          }
        }
        .addOnFailureListener {
          promise.resolve(mapOf("status" to "unavailable"))
        }
    }
  }

  private fun constantValue(className: String, fieldName: String): Int? {
    return try {
      Class.forName(className).getField(fieldName).getInt(null)
    } catch (_: Throwable) {
      null
    }
  }

  private fun sourceName(value: Int?): String {
    if (value == null) return "unknown"

    val className = "com.google.android.play.agesignals.model.AgeRangeSource"
    return when (value) {
      constantValue(className, "TIER_A") -> "self_declared"
      constantValue(className, "TIER_B") -> "guardian_declared"
      constantValue(className, "TIER_C") -> "platform_assessed"
      constantValue(className, "TIER_D") -> "platform_verified"
      else -> "unknown"
    }
  }
}
