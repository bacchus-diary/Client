module Fastlane
  module Actions
    class CordovaAction < Action
      def self.run(params)
        cordova(params[:plugins] || [])
        ionic
      end

      def self.cordova(plugins)
        puts "Checking Cordova ..."
        system('cordova -v')

        dirs = ['plugins', File.join('platforms', ENV["FASTLANE_PLATFORM_NAME"])]
        if !dirs.all? { |x| File.exist? x } then
          dirs.each do |dir|
            puts "Deleting dir: #{dir}"
            FileUtils.rm_rf dir
          end
          Dir.mkdir dirs.first

          system("cordova platform add #{ENV["FASTLANE_PLATFORM_NAME"]}")

          plugins.each do |line|
            system("cordova plugin add #{line}")
          end
        end
      end

      def self.ionic
        puts "Checking ionic ..."
        system('ionic -v')

        use_png('icon')
        use_png('splash')
        system("ionic resources")
      end

      def self.use_png(prefix)
        dir = File.join('resources')
        src = File.join(dir, "#{prefix}-#{ENV["FASTLANE_PLATFORM_NAME"]}.png")
        if File.exist?(src) then
          FileUtils.copy(src, File.join(dir, "#{prefix}.png"))
        end
      end

      #####################################################
      # @!group Documentation
      #####################################################

      def self.description
        "Cordova prepare"
      end

      def self.available_options
        [
          FastlaneCore::ConfigItem.new(key: :plugins,
          description: "Array of plugins",
          optional: true,
          is_string: false
          )
        ]
      end

      def self.authors
        ["Sawatani"]
      end

      def self.is_supported?(platform)
        true
      end
    end
  end
end
