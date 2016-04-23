module Fastlane
  module Actions
    class WriteSettingsAction < Action
      def self.run(params)
        require 'yaml'

        target = File.join('www', 'settings.yaml')
        settings = YAML::load_file(target)

        settings.each do |key, name|
          m = /^\${(\w+)}$/.match name
          if m && ENV.has_key?(m[1]) then
            settings[key] = ENV[m[1]]
          end
        end

        puts "Rewriting #{target}"
        File.write(target, settings.to_yaml)
      end

      #####################################################
      # @!group Documentation
      #####################################################

      def self.description
        "Write settings file"
      end

      def self.available_options
        []
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
