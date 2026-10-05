import ExpoModulesCore
import UIKit

#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

public class StudentHoodAgeSignalsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StudentHoodAgeSignals")

    AsyncFunction("requestAgeSignal") { (_: [String: Any], promise: Promise) in
      #if canImport(DeclaredAgeRange)
      if #available(iOS 26.0, *) {
        guard let viewController = appContext?.utilities?.currentViewController() else {
          promise.resolve(["status": "unavailable"])
          return
        }

        Task { @MainActor in
          do {
            let response = try await AgeRangeService.shared.requestAgeRange(
              ageGates: 13, 16, 18,
              in: viewController
            )

            switch response {
            case let .sharing(ageRange):
              var payload: [String: Any?] = [
                "status": "shared",
                "ageLower": ageRange.lowerBound,
                "ageUpper": ageRange.upperBound,
                "source": self.sourceName(ageRange.ageRangeDeclaration)
              ]
              promise.resolve(payload)

            case .declinedSharing:
              promise.resolve(["status": "not_shared"])

            @unknown default:
              promise.resolve(["status": "unavailable"])
            }
          } catch {
            promise.resolve(["status": "unavailable"])
          }
        }
      } else {
        promise.resolve(["status": "unavailable"])
      }
      #else
      promise.resolve(["status": "unavailable"])
      #endif
    }.runOnQueue(.main)
  }

  #if canImport(DeclaredAgeRange)
  @available(iOS 26.0, *)
  private func sourceName(_ declaration: AgeRangeService.AgeRangeDeclaration?) -> String {
    guard let declaration else {
      return "unknown"
    }

    let value = String(describing: declaration).lowercased()

    if value.contains("guardian") {
      return "guardian_declared"
    }
    if value.contains("confirmed") || value.contains("government") || value.contains("payment") {
      return "platform_verified"
    }
    if value.contains("checked") {
      return "platform_assessed"
    }
    if value.contains("self") {
      return "self_declared"
    }
    return "unknown"
  }
  #endif
}
