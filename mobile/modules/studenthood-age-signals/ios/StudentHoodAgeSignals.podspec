Pod::Spec.new do |s|
  s.name           = 'StudentHoodAgeSignals'
  s.version        = '1.0.0'
  s.summary        = 'StudentHood privacy-preserving platform age signal bridge'
  s.description    = 'Bridges Apple Declared Age Range into StudentHood age assurance.'
  s.author         = 'StudentHood'
  s.homepage       = 'https://kishorerohy.github.io/StudentHood/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.9'
end
