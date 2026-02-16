import SwiftUI

enum CardSize {
    case small
    case medium

    var width: CGFloat {
        switch self {
        case .small: return 28
        case .medium: return 32
        }
    }

    var height: CGFloat {
        switch self {
        case .small: return 38
        case .medium: return 44
        }
    }

    var fontSize: CGFloat {
        switch self {
        case .small: return 20
        case .medium: return 24
        }
    }

    var cornerRadius: CGFloat {
        switch self {
        case .small: return 3
        case .medium: return 4
        }
    }
}

struct FlipCardView: View {
    let digit: String
    let size: CardSize

    private let topColor = Color(red: 0x30/255, green: 0x30/255, blue: 0x30/255)
    private let bottomColor = Color(red: 0x1a/255, green: 0x1a/255, blue: 0x1a/255)
    private let textColor = Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255)
    private let dividerColor = Color(red: 0x11/255, green: 0x11/255, blue: 0x11/255)

    var body: some View {
        ZStack {
            VStack(spacing: 0.5) {
                // Top half
                ZStack {
                    RoundedCornersShape(radius: size.cornerRadius, corners: [.topLeft, .topRight])
                        .fill(topColor)
                        .frame(width: size.width, height: size.height / 2)

                    Text(digit)
                        .font(.system(size: size.fontSize, weight: .bold, design: .monospaced))
                        .foregroundColor(textColor)
                        .offset(y: size.height * 0.06)
                }
                .clipped()

                // Bottom half
                ZStack {
                    RoundedCornersShape(radius: size.cornerRadius, corners: [.bottomLeft, .bottomRight])
                        .fill(bottomColor)
                        .frame(width: size.width, height: size.height / 2)

                    Text(digit)
                        .font(.system(size: size.fontSize, weight: .bold, design: .monospaced))
                        .foregroundColor(textColor)
                        .offset(y: -size.height * 0.06)
                }
                .clipped()
            }
        }
        .frame(width: size.width, height: size.height)
    }
}

struct ColonView: View {
    let size: CardSize

    private let dotColor = Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255).opacity(0.5)

    var body: some View {
        VStack(spacing: size == .small ? 8 : 10) {
            Circle()
                .fill(dotColor)
                .frame(width: 3, height: 3)
            Circle()
                .fill(dotColor)
                .frame(width: 3, height: 3)
        }
        .frame(width: 8, height: size.height)
    }
}

struct RoundedCornersShape: Shape {
    var radius: CGFloat
    var corners: Corners

    struct Corners: OptionSet {
        let rawValue: Int
        static let topLeft = Corners(rawValue: 1 << 0)
        static let topRight = Corners(rawValue: 1 << 1)
        static let bottomLeft = Corners(rawValue: 1 << 2)
        static let bottomRight = Corners(rawValue: 1 << 3)
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let tl = corners.contains(.topLeft) ? radius : 0
        let tr = corners.contains(.topRight) ? radius : 0
        let bl = corners.contains(.bottomLeft) ? radius : 0
        let br = corners.contains(.bottomRight) ? radius : 0

        path.move(to: CGPoint(x: rect.minX + tl, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - tr, y: rect.minY))
        if tr > 0 {
            path.addArc(center: CGPoint(x: rect.maxX - tr, y: rect.minY + tr), radius: tr, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        }
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br))
        if br > 0 {
            path.addArc(center: CGPoint(x: rect.maxX - br, y: rect.maxY - br), radius: br, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        }
        path.addLine(to: CGPoint(x: rect.minX + bl, y: rect.maxY))
        if bl > 0 {
            path.addArc(center: CGPoint(x: rect.minX + bl, y: rect.maxY - bl), radius: bl, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        }
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + tl))
        if tl > 0 {
            path.addArc(center: CGPoint(x: rect.minX + tl, y: rect.minY + tl), radius: tl, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        }
        path.closeSubpath()
        return path
    }
}
