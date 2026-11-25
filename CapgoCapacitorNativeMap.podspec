require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapgoCapacitorNativeMap'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'].sub(/\Agit\+/, ''), :tag => s.version.to_s }
  s.ios.deployment_target = '15.0'
  s.default_subspec = 'Lite'

  s.subspec 'Lite' do |lite|
    lite.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
    lite.dependency 'Capacitor'
  end

  s.subspec 'WebViewNativeUIEngine' do |engine|
    engine.dependency 'CapgoCapacitorNativeMap/Lite'
    engine.dependency 'WebViewNativeUIEngine', '1.0.11'
  end
end