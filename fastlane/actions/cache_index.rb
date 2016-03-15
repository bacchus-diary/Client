module Fastlane
  module Actions
    class CacheIndexAction < Action
      def self.run(params)
        Dir.chdir('www') do
          rewrite('index.html')
        end
      end

      def self.rewrite(*path)
        require 'nokogiri'
        target = File.join(*path)
        doc = File.open(target) do |file|
          Nokogiri::HTML(file)
        end

        fonts(doc, 'cache', 'fonts')
        js(doc, 'cache', 'js')

        puts "Rewriting #{target}"
        File.write(target, doc.to_html)
      end

      def self.fonts(doc, *path)
        doc.xpath("//link[@rel='stylesheet']").each do |css|
          href = css['href']
          if /^https:\/\/fonts.googleapis.com\/css\?.*$/.match href then
            dir = File.join(*path)
            filename = cache_digest.call(href, dir)

            File.open(File.join(dir, filename), 'r+') do |file|
              lines = file.readlines
              file.seek(0)

              lines.each do |line|
                m = /(^.*url\()(https:[^\)]+)(\).*)/.match line
                if m != nil then
                  loaded = cache_digest.call(m[2], dir)
                  line = "#{m[1]}#{loaded}#{m[3]}"
                end
                file.puts line
              end
              file.flush
              file.truncate(file.pos)
            end

            css['href'] = path.join('/') + '/' + filename
          end
        end
      end

      def self.js(doc, *path)
        doc.xpath("//script[@type='text/javascript']").each do |js|
          href = js['src']
          if /^https:\/\/.*\.js$/.match(href) then
            dir = File.join(*path)
            js['src'] = path.join('/') + '/' + cache_digest.call(href, dir)
          end
        end
      end

      def self.cache_digest(url, dir)
        require "digest/md5"
        names = [Digest::MD5.hexdigest(url)]
        m = /.*[^\w]([\w]+)$/.match url.split('?')[0]
        if m != nil then
          names << m[1]
        end
        name = "cached-#{names.join('.')}"
        target = File.join(dir, name)
        if !File.exist?(dir) then
          Dir.mkdir(dir)
        end
        retry_count = 3
        begin
          puts "Downloading #{url} to #{target}"
          File.write(target, Net::HTTP.get(URI(url)))
        rescue
          puts "Error on downloading"
          retry_count -= 1
          if 0 < retry_count then
            retry
          else
            raise
          end
        end
        return name
      end

      #####################################################
      # @!group Documentation
      #####################################################

      def self.description
        "Cache fonts and javascripts in index.html"
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
